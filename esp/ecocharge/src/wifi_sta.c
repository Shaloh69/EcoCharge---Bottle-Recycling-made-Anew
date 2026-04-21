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
//   PHASE_INITIAL   — first connect; counts retries; signals FAIL after
//                     WIFI_MAX_RETRIES attempts so app_main can fall back.
//   PHASE_CONNECTED — after first IP obtained; always reconnects on drop
//                     (handles AP reboots, interference) — no retry limit.
//
// Fixes vs original:
//   • No vTaskDelay inside the event handler (blocks the event-loop task).
//   • Auth mode adapts: open network → WIFI_AUTH_OPEN,
//                       password set → WIFI_AUTH_WPA_WPA2_PSK  (not WPA2-only).
//   • esp_netif_init / esp_event_loop_create_default guarded — called once.
//   • Unlimited background reconnect after first successful connect.
// ============================================================================

#define WIFI_CONNECTED_BIT  BIT0
#define WIFI_FAIL_BIT       BIT1

typedef enum { PHASE_INITIAL = 0, PHASE_CONNECTED } wifi_phase_t;

static EventGroupHandle_t s_evt_group   = NULL;
static volatile int       s_connected   = 0;
static volatile int       s_retry_count = 0;
static volatile wifi_phase_t s_phase    = PHASE_INITIAL;
static bool               s_netif_ready = false;

// ---------------------------------------------------------------------------
// Event handler — must not block (no vTaskDelay, no mutex lock)
// ---------------------------------------------------------------------------
static void _event_handler(void *arg, esp_event_base_t base,
                            int32_t id, void *data)
{
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();

    } else if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        s_connected = 0;

        wifi_event_sta_disconnected_t *disc =
            (wifi_event_sta_disconnected_t *)data;
        ESP_LOGW(LOG_TAG, "WiFi disconnected — reason %d", disc->reason);

        if (s_phase == PHASE_CONNECTED) {
            // Background reconnect — no limit, handles AP reboots
            ESP_LOGI(LOG_TAG, "WiFi lost — reconnecting...");
            esp_wifi_connect();

        } else {
            // Still in initial-connect phase — count retries
            if (s_retry_count < WIFI_MAX_RETRIES) {
                s_retry_count++;
                ESP_LOGI(LOG_TAG, "WiFi retry %d/%d...",
                         s_retry_count, WIFI_MAX_RETRIES);
                esp_wifi_connect();
            } else {
                ESP_LOGE(LOG_TAG, "WiFi: max retries exceeded — giving up");
                xEventGroupSetBits(s_evt_group, WIFI_FAIL_BIT);
            }
        }

    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *ev = (ip_event_got_ip_t *)data;
        ESP_LOGI(LOG_TAG, "WiFi connected — IP: " IPSTR,
                 IP2STR(&ev->ip_info.ip));
        s_retry_count = 0;
        s_connected   = 1;
        s_phase       = PHASE_CONNECTED;
        xEventGroupSetBits(s_evt_group, WIFI_CONNECTED_BIT);
    }
}

// ---------------------------------------------------------------------------
// Public: wifi_sta_connect
// Blocks until connected or failed (max ~30 s).
// ---------------------------------------------------------------------------
esp_err_t wifi_sta_connect(void)
{
    s_evt_group   = xEventGroupCreate();
    s_retry_count = 0;
    s_phase       = PHASE_INITIAL;
    s_connected   = 0;

    // ── One-time system init (safe to guard with a flag) ───────────────────
    if (!s_netif_ready) {
        ESP_ERROR_CHECK(esp_netif_init());
        ESP_ERROR_CHECK(esp_event_loop_create_default());
        esp_netif_create_default_wifi_sta();
        s_netif_ready = true;
    }

    // ── WiFi driver init ───────────────────────────────────────────────────
    wifi_init_config_t init_cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&init_cfg));

    // ── Register event handlers ────────────────────────────────────────────
    esp_event_handler_instance_t inst_wifi, inst_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID,    &_event_handler, NULL, &inst_wifi));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        IP_EVENT,   IP_EVENT_STA_GOT_IP, &_event_handler, NULL, &inst_ip));

    // ── Read credentials: NVS first, compile-time fallback ────────────────
    char ssid[64] = {0};
    char pass[64] = {0};
    bool use_nvs  = (nvs_config_get_wifi(ssid, sizeof(ssid),
                                         pass, sizeof(pass)) == ESP_OK
                     && ssid[0] != '\0');

    if (!use_nvs) {
        strncpy(ssid, WIFI_SSID_DEFAULT, sizeof(ssid) - 1);
        strncpy(pass, WIFI_PASS_DEFAULT, sizeof(pass) - 1);
    }

    // ── Build wifi_config ──────────────────────────────────────────────────
    wifi_config_t wifi_cfg = {0};
    strncpy((char *)wifi_cfg.sta.ssid,     ssid, sizeof(wifi_cfg.sta.ssid)     - 1);
    strncpy((char *)wifi_cfg.sta.password, pass, sizeof(wifi_cfg.sta.password) - 1);

    // Auth mode: open networks must not enforce WPA2
    if (strlen(pass) == 0) {
        wifi_cfg.sta.threshold.authmode = WIFI_AUTH_OPEN;
    } else {
        // WPA_WPA2_PSK accepts WPA, WPA2, and WPA2/WPA3 mixed networks
        wifi_cfg.sta.threshold.authmode = WIFI_AUTH_WPA_WPA2_PSK;
    }

    // Disable PMF requirement — improves compatibility with older APs
    wifi_cfg.sta.pmf_cfg.capable  = true;
    wifi_cfg.sta.pmf_cfg.required = false;

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_cfg));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(LOG_TAG, "Connecting to \"%s\" (%s)...",
             ssid, use_nvs ? "NVS" : "config.h");

    // ── Wait up to 30 s for result ─────────────────────────────────────────
    EventBits_t bits = xEventGroupWaitBits(
        s_evt_group,
        WIFI_CONNECTED_BIT | WIFI_FAIL_BIT,
        pdFALSE, pdFALSE,
        pdMS_TO_TICKS(30000));

    // Unregister one-shot handlers (reconnect handler stays active via
    // the persistent event loop — no need to re-register after reconnect)
    esp_event_handler_instance_unregister(IP_EVENT,   IP_EVENT_STA_GOT_IP, inst_ip);
    esp_event_handler_instance_unregister(WIFI_EVENT, ESP_EVENT_ANY_ID,    inst_wifi);
    vEventGroupDelete(s_evt_group);
    s_evt_group = NULL;

    if (bits & WIFI_CONNECTED_BIT) {
        // Re-register a persistent handler for background reconnect
        esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID,    &_event_handler, NULL);
        esp_event_handler_register(IP_EVENT,   IP_EVENT_STA_GOT_IP, &_event_handler, NULL);
        return ESP_OK;
    }

    if (bits & WIFI_FAIL_BIT) {
        ESP_LOGE(LOG_TAG, "WiFi connection failed after %d retries", WIFI_MAX_RETRIES);
    } else {
        ESP_LOGE(LOG_TAG, "WiFi connection timed out (30 s)");
    }
    return ESP_FAIL;
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
