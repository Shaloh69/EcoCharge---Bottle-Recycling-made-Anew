#include "wifi_ap.h"
#include "config.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "lwip/inet.h"

// ============================================================================
// EcoCharge WiFi Access Point - Implementation
// ============================================================================

static bool ap_active = false;
static uint8_t connected_clients = 0;

// ----------------------------------------------------------------------------
// WiFi Event Handler
// ----------------------------------------------------------------------------
static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                               int32_t event_id, void* event_data) {
    if (event_id == WIFI_EVENT_AP_STACONNECTED) {
        wifi_event_ap_staconnected_t* event = (wifi_event_ap_staconnected_t*) event_data;
        connected_clients++;
        ESP_LOGI(LOG_TAG, "Station connected, MAC: %02x:%02x:%02x:%02x:%02x:%02x, clients: %d",
                 event->mac[0], event->mac[1], event->mac[2],
                 event->mac[3], event->mac[4], event->mac[5], connected_clients);
    } else if (event_id == WIFI_EVENT_AP_STADISCONNECTED) {
        wifi_event_ap_stadisconnected_t* event = (wifi_event_ap_stadisconnected_t*) event_data;
        if (connected_clients > 0) {
            connected_clients--;
        }
        ESP_LOGI(LOG_TAG, "Station disconnected, MAC: %02x:%02x:%02x:%02x:%02x:%02x, clients: %d",
                 event->mac[0], event->mac[1], event->mac[2],
                 event->mac[3], event->mac[4], event->mac[5], connected_clients);
    }
}

// ----------------------------------------------------------------------------
// Public Functions
// ----------------------------------------------------------------------------

static bool s_ap_netif_ready = false;

esp_err_t wifi_ap_init(void) {
    ESP_LOGI(LOG_TAG, "Initializing WiFi Access Point...");

    // Guard: esp_netif_init / esp_event_loop_create_default must only run once
    if (!s_ap_netif_ready) {
        ESP_ERROR_CHECK(esp_netif_init());
        ESP_ERROR_CHECK(esp_event_loop_create_default());
        s_ap_netif_ready = true;
    }

    // Create default WiFi AP
    esp_netif_t *ap_netif = esp_netif_create_default_wifi_ap();

    // Set static IP for AP
    esp_netif_ip_info_t ip_info;
    IP4_ADDR(&ip_info.ip, 192, 168, 4, 1);
    IP4_ADDR(&ip_info.gw, 192, 168, 4, 1);
    IP4_ADDR(&ip_info.netmask, 255, 255, 255, 0);

    esp_netif_dhcps_stop(ap_netif);
    esp_netif_set_ip_info(ap_netif, &ip_info);
    esp_netif_dhcps_start(ap_netif);

    // Initialize WiFi
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    // Register event handler
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID,
                                               &wifi_event_handler, NULL));

    // Configure AP
    wifi_config_t wifi_config = {
        .ap = {
            .ssid = WIFI_AP_SSID,
            .ssid_len = strlen(WIFI_AP_SSID),
            .channel = WIFI_AP_CHANNEL,
            .password = WIFI_AP_PASSWORD,
            .max_connection = WIFI_AP_MAX_CONNECTIONS,
            .authmode = WIFI_AUTH_WPA2_PSK,
            .beacon_interval = WIFI_AP_BEACON_INTERVAL,
        },
    };

    // Set WiFi mode to AP
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ap_active = true;

    ESP_LOGI(LOG_TAG, "WiFi AP started successfully");
    ESP_LOGI(LOG_TAG, "SSID: %s", WIFI_AP_SSID);
    ESP_LOGI(LOG_TAG, "Password: %s", WIFI_AP_PASSWORD);
    ESP_LOGI(LOG_TAG, "IP Address: %s", AP_IP_ADDR);
    ESP_LOGI(LOG_TAG, "Connect your phone to this network!");

    return ESP_OK;
}

esp_err_t wifi_ap_stop(void) {
    if (!ap_active) {
        return ESP_ERR_INVALID_STATE;
    }

    ESP_LOGI(LOG_TAG, "Stopping WiFi AP...");

    esp_err_t ret = esp_wifi_stop();
    if (ret == ESP_OK) {
        ap_active = false;
        connected_clients = 0;
    }

    return ret;
}

uint8_t wifi_ap_get_client_count(void) {
    return connected_clients;
}

bool wifi_ap_is_active(void) {
    return ap_active;
}
