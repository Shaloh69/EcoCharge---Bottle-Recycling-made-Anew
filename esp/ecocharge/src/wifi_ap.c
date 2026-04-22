#include "wifi_ap.h"
#include "config.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"

// ============================================================================
// EcoCharge WiFi Access Point
//
// Prerequisites (done once in app_main before this module is called):
//   esp_netif_init()
//   esp_event_loop_create_default()
//   esp_netif_create_default_wifi_sta()
//   esp_netif_create_default_wifi_ap()   ← AP netif already created + configured
//   esp_wifi_init(&WIFI_INIT_CONFIG_DEFAULT())
//
// esp_netif_create_default_wifi_ap() already sets IP = 192.168.4.1,
// GW = 192.168.4.1, mask = 255.255.255.0, and enables the DHCP server.
// No additional IP/DHCP configuration is needed.
//
// This module only sets the AP credentials, switches the WiFi mode to AP,
// and starts the radio.  If wifi_sta_connect() was called first and stopped
// WiFi on failure (without deinit), this module just switches modes on the
// already-initialised driver.
// ============================================================================

static bool    ap_active        = false;
static uint8_t connected_clients = 0;

static void _ap_event_handler(void *arg, esp_event_base_t base,
                               int32_t id, void *data)
{
    if (id == WIFI_EVENT_AP_STACONNECTED) {
        wifi_event_ap_staconnected_t *e = (wifi_event_ap_staconnected_t *)data;
        connected_clients++;
        ESP_LOGI(LOG_TAG, "Client connected  MAC=%02x:%02x:%02x:%02x:%02x:%02x  total=%d",
                 e->mac[0], e->mac[1], e->mac[2],
                 e->mac[3], e->mac[4], e->mac[5], connected_clients);

    } else if (id == WIFI_EVENT_AP_STADISCONNECTED) {
        wifi_event_ap_stadisconnected_t *e = (wifi_event_ap_stadisconnected_t *)data;
        if (connected_clients > 0) connected_clients--;
        ESP_LOGI(LOG_TAG, "Client disconnected MAC=%02x:%02x:%02x:%02x:%02x:%02x  total=%d",
                 e->mac[0], e->mac[1], e->mac[2],
                 e->mac[3], e->mac[4], e->mac[5], connected_clients);
    }
}

esp_err_t wifi_ap_init(void)
{
    ESP_LOGI(LOG_TAG, "Starting WiFi AP...");

    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID,
                                               &_ap_event_handler, NULL));

    wifi_config_t wifi_cfg = {
        .ap = {
            .ssid            = WIFI_AP_SSID,
            .ssid_len        = strlen(WIFI_AP_SSID),
            .channel         = WIFI_AP_CHANNEL,
            .password        = WIFI_AP_PASSWORD,
            .max_connection  = WIFI_AP_MAX_CONNECTIONS,
            .authmode        = WIFI_AUTH_WPA2_PSK,
            .beacon_interval = WIFI_AP_BEACON_INTERVAL,
        },
    };

    // APSTA mode: AP is visible + STA interface stays dormant but allows
    // esp_wifi_scan_start() to work while the AP is up (needed for /api/wifi/scan).
    // Pure WIFI_MODE_AP blocks scanning and is less stable on some routers.
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &wifi_cfg));
    ESP_ERROR_CHECK(esp_wifi_start());

    ap_active = true;

    ESP_LOGI(LOG_TAG, "AP active — SSID: %s  pass: %s  IP: %s",
             WIFI_AP_SSID, WIFI_AP_PASSWORD, AP_IP_ADDR);
    ESP_LOGI(LOG_TAG, "Browse to http://%s/provision to configure WiFi", AP_IP_ADDR);

    return ESP_OK;
}

esp_err_t wifi_ap_stop(void)
{
    if (!ap_active) return ESP_ERR_INVALID_STATE;
    esp_err_t ret = esp_wifi_stop();
    if (ret == ESP_OK) {
        ap_active        = false;
        connected_clients = 0;
    }
    return ret;
}

uint8_t wifi_ap_get_client_count(void) { return connected_clients; }
bool    wifi_ap_is_active(void)        { return ap_active; }
