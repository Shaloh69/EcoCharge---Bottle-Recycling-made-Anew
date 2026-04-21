#include "wifi_sta.h"
#include "config.h"
#include "nvs_config.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include <string.h>

// ============================================================================
// EcoCharge — WiFi Station Driver
//
// Two-phase design:
//   PHASE_INITIAL   — first connect; counts retries; signals FAIL_BIT after
//                     WIFI_MAX_RETRIES so app_main can fall back gracefully.
//   PHASE_CONNECTED — after first IP obtained; always reconnects on drop
//                     (handles AP reboots, interference) — no retry limit.
//
// The persistent background handler only touches s_connected / s_phase.
// It NEVER calls xEventGroupSetBits — the event group is deleted after the
// initial connect sequence to avoid NULL-dereference crashes on reconnect.
// ============================================================================

#define WIFI_CONNECTED_BIT  BIT0
#define WIFI_FAIL_BIT       BIT1

typedef enum { PHASE_INITIAL = 0, PHASE_CONNECTED } wifi_phase_t;

static EventGroupHandle_t  s_evt_group   = NULL;
static volatile int        s_connected   = 0;
static volatile int        s_retry_count = 0;
static volatile wifi_phase_t s_phase     = PHASE_INITIAL;
static bool                s_netif_ready = false;

// ---------------------------------------------------------------------------
// Background reconnect handler — registered after initial connect succeeds.
// Must NOT touch s_evt_group (it is NULL at this point).
// Must NOT block.
// ---------------------------------------------------------------------------
static void _reconnect_handler(void *arg, esp_event_base_t base,
                                int32_t id, void *data)
{
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        s_connected = 0;
        wifi_event_sta_disconnected_t *d = (wifi_event_sta_disconnected_t *)data;
        ESP_LOGW(LOG_TAG, "WiFi dropped (reason %d) — reconnecting...", d->reason);
        esp_wifi_connect();

    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *ev = (ip_event_got_ip_t *)data;
        ESP_LOGI(LOG_TAG, "WiFi reconnected — IP: " IPSTR, IP2STR(&ev->ip_info.ip));
        s_connected = 1;
    }
}

// ---------------------------------------------------------------------------
// Initial connect handler — registered only during wifi_sta_connect().
// Sets event-group bits to unblock the waiting caller.
// ---------------------------------------------------------------------------
static void _connect_handler(void *arg, esp_event_base_t base,
                              int32_t id, void *data)
{
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();

    } else if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        s_connected = 0;
        wifi_event_sta_disconnected_t *d = (wifi_event_sta_disconnected_t *)data;
        ESP_LOGW(LOG_TAG, "WiFi disconnected (reason %d) — retry %d/%d",
                 d->reason, s_retry_count + 1, WIFI_MAX_RETRIES);

        if (s_retry_count < WIFI_MAX_RETRIES) {
            s_retry_count++;
            esp_wifi_connect();
        } else {
            xEventGroupSetBits(s_evt_group, WIFI_FAIL_BIT);
        }

    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *ev = (ip_event_got_ip_t *)data;
        ESP_LOGI(LOG_TAG, "WiFi connected — IP: " IPSTR, IP2STR(&ev->ip_info.ip));
        s_retry_count = 0;
        s_connected   = 1;
        s_phase       = PHASE_CONNECTED;
        xEventGroupSetBits(s_evt_group, WIFI_CONNECTED_BIT);
    }
}

// ---------------------------------------------------------------------------
// Public: wifi_sta_connect — blocks up to 30 s
// ---------------------------------------------------------------------------
esp_err_t wifi_sta_connect(void)
{
    s_evt_group   = xEventGroupCreate();
    s_retry_count = 0;
    s_phase       = PHASE_INITIAL;
    s_connected   = 0;

    // One-time system init — safe to call only once across the whole app
    if (!s_netif_ready) {
        ESP_ERROR_CHECK(esp_netif_init());
        ESP_ERROR_CHECK(esp_event_loop_create_default());
        esp_netif_create_default_wifi_sta();
        s_netif_ready = true;
    }

    wifi_init_config_t init_cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&init_cfg));

    // Register initial-connect handlers (will be unregistered below)
    esp_event_handler_instance_t inst_wifi, inst_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID,    &_connect_handler, NULL, &inst_wifi));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        IP_EVENT,   IP_EVENT_STA_GOT_IP, &_connect_handler, NULL, &inst_ip));

    // Load credentials: NVS first, compile-time defaults as fallback
    char ssid[64] = {0};
    char pass[64] = {0};
    bool use_nvs  = (nvs_config_get_wifi(ssid, sizeof(ssid),
                                         pass, sizeof(pass)) == ESP_OK
                     && ssid[0] != '\0');
    if (!use_nvs) {
        strncpy(ssid, WIFI_SSID_DEFAULT, sizeof(ssid) - 1);
        strncpy(pass, WIFI_PASS_DEFAULT, sizeof(pass) - 1);
    }

    wifi_config_t wifi_cfg = {0};
    strncpy((char *)wifi_cfg.sta.ssid,     ssid, sizeof(wifi_cfg.sta.ssid)     - 1);
    strncpy((char *)wifi_cfg.sta.password, pass, sizeof(wifi_cfg.sta.password) - 1);

    // Adapt auth mode: open networks must not require WPA2
    wifi_cfg.sta.threshold.authmode =
        (strlen(pass) == 0) ? WIFI_AUTH_OPEN : WIFI_AUTH_WPA_WPA2_PSK;

    // Disable PMF required — improves compat with older APs
    wifi_cfg.sta.pmf_cfg.capable  = true;
    wifi_cfg.sta.pmf_cfg.required = false;

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_cfg));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(LOG_TAG, "Connecting to \"%s\" (%s)...",
             ssid, use_nvs ? "NVS" : "config.h");

    EventBits_t bits = xEventGroupWaitBits(
        s_evt_group,
        WIFI_CONNECTED_BIT | WIFI_FAIL_BIT,
        pdFALSE, pdFALSE,
        pdMS_TO_TICKS(30000));

    // Remove the one-shot handlers before deleting the event group
    esp_event_handler_instance_unregister(WIFI_EVENT, ESP_EVENT_ANY_ID,    inst_wifi);
    esp_event_handler_instance_unregister(IP_EVENT,   IP_EVENT_STA_GOT_IP, inst_ip);
    vEventGroupDelete(s_evt_group);
    s_evt_group = NULL;   // must be NULL before background handler is registered

    if (!(bits & WIFI_CONNECTED_BIT)) {
        ESP_LOGE(LOG_TAG, "WiFi failed (%s)",
                 (bits & WIFI_FAIL_BIT) ? "max retries" : "timeout");
        return ESP_FAIL;
    }

    // Register the lightweight background handler — never touches s_evt_group
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
    s_phase     = PHASE_INITIAL;
    esp_wifi_disconnect();
    esp_wifi_stop();
    esp_wifi_deinit();
}
