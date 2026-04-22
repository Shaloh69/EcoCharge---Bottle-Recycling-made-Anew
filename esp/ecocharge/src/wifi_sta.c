#include "wifi_sta.h"
#include "config.h"
#include "nvs_config.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_timer.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include <string.h>

// ============================================================================
// EcoCharge — WiFi Station Driver
//
// Prerequisites (done once in app_main before this module is called):
//   esp_netif_init()
//   esp_event_loop_create_default()
//   esp_netif_create_default_wifi_sta()
//   esp_netif_create_default_wifi_ap()
//   esp_wifi_init(&WIFI_INIT_CONFIG_DEFAULT())
//
// This module only configures STA and starts the connection.
//
// On failure: esp_wifi_stop() but NOT esp_wifi_deinit().
// wifi_ap_init() can then call esp_wifi_set_mode(AP) + esp_wifi_start()
// on the already-running driver without reinitialising it.
//
// Auth threshold notes (from Espressif docs):
//   WIFI_AUTH_WPA2_PSK as the STA *threshold* accepts WPA2, WPA3, and
//   WPA2/WPA3 transition-mode APs — the stack auto-negotiates the best.
//   WIFI_AUTH_WPA2_WPA3_PSK is for SoftAP mode, NOT for STA threshold.
//
// esp_wifi_set_ps(WIFI_PS_NONE) is called after successful connection,
// not before — per Espressif's official guidance.
// ============================================================================

#define WIFI_CONNECTED_BIT      BIT0
#define WIFI_FAIL_BIT           BIT1
#define WIFI_CONNECT_TIMEOUT_MS 45000   // 5 retries × up to 7 s each + margin
#define WIFI_RECONNECT_DELAY_US 2000000 // 2 s between background reconnects

static const char *_reason_str(uint8_t r)
{
    switch (r) {
    case   1: return "UNSPECIFIED";
    case   2: return "AUTH_EXPIRE";
    case   3: return "AUTH_LEAVE";
    case   4: return "ASSOC_EXPIRE";
    case   8: return "ASSOC_LEAVE";
    case  14: return "4WAY_HANDSHAKE_TIMEOUT (wrong password)";
    case 200: return "BEACON_TIMEOUT (AP out of range/off)";
    case 201: return "NO_AP_FOUND (wrong SSID or out of range)";
    case 202: return "AUTH_FAIL (wrong password)";
    case 203: return "ASSOC_FAIL";
    case 204: return "HANDSHAKE_TIMEOUT (auth mismatch)";
    case 205: return "CONNECTION_FAIL";
    default:  return "UNKNOWN";
    }
}

static EventGroupHandle_t  s_evt_group       = NULL;
static volatile int        s_connected       = 0;
static volatile int        s_retry_count     = 0;
static esp_timer_handle_t  s_reconnect_timer = NULL;

// ---------------------------------------------------------------------------
// Timer callback — fires 2 s after a drop to reconnect.
// Runs in the esp_timer dispatch task, not the event loop task, so it is
// safe to call esp_wifi_connect() here without blocking event delivery.
// ---------------------------------------------------------------------------
static void _reconnect_cb(void *arg)
{
    ESP_LOGI(LOG_TAG, "WiFi reconnecting...");
    esp_wifi_connect();
}

// ---------------------------------------------------------------------------
// Background handler — registered only after initial connect succeeds.
// NEVER touches s_evt_group (it is NULL after vEventGroupDelete).
// ---------------------------------------------------------------------------
static void _reconnect_handler(void *arg, esp_event_base_t base,
                                int32_t id, void *data)
{
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        s_connected = 0;
        wifi_event_sta_disconnected_t *d = (wifi_event_sta_disconnected_t *)data;
        ESP_LOGW(LOG_TAG, "WiFi dropped — reason %d (%s) — reconnect in 2 s",
                 d->reason, _reason_str(d->reason));
        esp_timer_stop(s_reconnect_timer);
        esp_timer_start_once(s_reconnect_timer, WIFI_RECONNECT_DELAY_US);

    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *ev = (ip_event_got_ip_t *)data;
        ESP_LOGI(LOG_TAG, "WiFi reconnected — IP: " IPSTR, IP2STR(&ev->ip_info.ip));
        s_connected = 1;
    }
}

// ---------------------------------------------------------------------------
// Initial connect handler — registered only during wifi_sta_connect().
// ---------------------------------------------------------------------------
static void _connect_handler(void *arg, esp_event_base_t base,
                              int32_t id, void *data)
{
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_START) {
        ESP_LOGI(LOG_TAG, "STA started — connecting...");
        esp_wifi_connect();

    } else if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        s_connected = 0;
        wifi_event_sta_disconnected_t *d = (wifi_event_sta_disconnected_t *)data;
        ESP_LOGW(LOG_TAG, "Attempt failed — reason %d (%s) — retry %d/%d",
                 d->reason, _reason_str(d->reason),
                 s_retry_count + 1, WIFI_MAX_RETRIES);

        if (s_retry_count < WIFI_MAX_RETRIES) {
            s_retry_count++;
            esp_wifi_connect();
        } else {
            xEventGroupSetBits(s_evt_group, WIFI_FAIL_BIT);
        }

    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *ev = (ip_event_got_ip_t *)data;
        ESP_LOGI(LOG_TAG, "Connected — IP: " IPSTR, IP2STR(&ev->ip_info.ip));
        s_retry_count = 0;
        s_connected   = 1;
        xEventGroupSetBits(s_evt_group, WIFI_CONNECTED_BIT);
    }
}

// ---------------------------------------------------------------------------
// Public: wifi_sta_connect — blocks up to WIFI_CONNECT_TIMEOUT_MS
// ---------------------------------------------------------------------------
esp_err_t wifi_sta_connect(void)
{
    s_evt_group   = xEventGroupCreate();
    s_retry_count = 0;
    s_connected   = 0;

    // Create reconnect timer once per boot
    if (s_reconnect_timer == NULL) {
        esp_timer_create_args_t ta = {
            .callback = _reconnect_cb,
            .name     = "wifi_reconnect",
        };
        esp_timer_create(&ta, &s_reconnect_timer);
    }

    // Register one-shot connect handlers before starting WiFi
    esp_event_handler_instance_t inst_wifi, inst_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID,    &_connect_handler, NULL, &inst_wifi));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        IP_EVENT,   IP_EVENT_STA_GOT_IP, &_connect_handler, NULL, &inst_ip));

    // Load credentials — NVS first, compile-time fallback
    char ssid[64] = {0};
    char pass[64] = {0};
    bool use_nvs  = (nvs_config_get_wifi(ssid, sizeof(ssid),
                                         pass, sizeof(pass)) == ESP_OK
                     && ssid[0] != '\0');
    if (!use_nvs) {
        strncpy(ssid, WIFI_SSID_DEFAULT, sizeof(ssid) - 1);
        strncpy(pass, WIFI_PASS_DEFAULT, sizeof(pass) - 1);
    }

    ESP_LOGI(LOG_TAG, "Connecting to \"%s\" (source: %s)...",
             ssid, use_nvs ? "NVS" : "config.h defaults");

    wifi_config_t wifi_cfg = {0};
    strncpy((char *)wifi_cfg.sta.ssid,     ssid, sizeof(wifi_cfg.sta.ssid)     - 1);
    strncpy((char *)wifi_cfg.sta.password, pass, sizeof(wifi_cfg.sta.password) - 1);

    // STA threshold = minimum accepted security.
    // WIFI_AUTH_WPA2_PSK lets the stack auto-negotiate WPA3 when the AP
    // supports it (transition mode).  Do NOT use WIFI_AUTH_WPA2_WPA3_PSK
    // here — that enum value is for SoftAP configuration, not STA threshold.
    wifi_cfg.sta.threshold.authmode =
        (strlen(pass) == 0) ? WIFI_AUTH_OPEN : WIFI_AUTH_WPA2_PSK;

    // PMF capable but not required — broadest router compatibility
    wifi_cfg.sta.pmf_cfg.capable  = true;
    wifi_cfg.sta.pmf_cfg.required = false;

    // Scan all channels — slower but finds hidden / non-standard-channel APs
    wifi_cfg.sta.scan_method = WIFI_ALL_CHANNEL_SCAN;

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_cfg));
    ESP_ERROR_CHECK(esp_wifi_start());

    EventBits_t bits = xEventGroupWaitBits(
        s_evt_group,
        WIFI_CONNECTED_BIT | WIFI_FAIL_BIT,
        pdFALSE, pdFALSE,
        pdMS_TO_TICKS(WIFI_CONNECT_TIMEOUT_MS));

    // Unregister one-shot handlers before deleting the event group
    esp_event_handler_instance_unregister(WIFI_EVENT, ESP_EVENT_ANY_ID,    inst_wifi);
    esp_event_handler_instance_unregister(IP_EVENT,   IP_EVENT_STA_GOT_IP, inst_ip);
    vEventGroupDelete(s_evt_group);
    s_evt_group = NULL;

    if (!(bits & WIFI_CONNECTED_BIT)) {
        const char *why = (bits & WIFI_FAIL_BIT) ? "max retries" : "timeout";
        ESP_LOGE(LOG_TAG, "WiFi connection failed (%s) — switching to AP mode", why);
        // Stop but do NOT deinit — wifi_ap_init() will call set_mode(AP) +
        // start() on the already-initialised driver without reinitialising it.
        esp_wifi_stop();
        return ESP_FAIL;
    }

    // Disable power save after connection — per Espressif guidance this must
    // be called after the connection is established, not before.
    esp_wifi_set_ps(WIFI_PS_NONE);

    // Register persistent background reconnect handler
    esp_event_handler_register(WIFI_EVENT, WIFI_EVENT_STA_DISCONNECTED,
                                &_reconnect_handler, NULL);
    esp_event_handler_register(IP_EVENT,   IP_EVENT_STA_GOT_IP,
                                &_reconnect_handler, NULL);
    return ESP_OK;
}

int wifi_sta_is_connected(void)
{
    return s_connected;
}

void wifi_sta_stop(void)
{
    s_connected = 0;
    if (s_reconnect_timer) {
        esp_timer_stop(s_reconnect_timer);
    }
    esp_wifi_disconnect();
    esp_wifi_stop();
}
