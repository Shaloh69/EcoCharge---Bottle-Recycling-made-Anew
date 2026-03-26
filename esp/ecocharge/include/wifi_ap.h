#ifndef WIFI_AP_H
#define WIFI_AP_H

// ============================================================================
// EcoCharge WiFi Access Point
// AP parameters are defined in config.h (WIFI_AP_SSID, WIFI_AP_PASSWORD, etc.)
// ============================================================================

#include "esp_err.h"
#include <stdbool.h>
#include <stdint.h>

/**
 * @brief Start WiFi in Access Point mode using settings from config.h.
 *        Calls esp_netif_init() and esp_event_loop_create_default() internally.
 * @return ESP_OK on success.
 */
esp_err_t wifi_ap_init(void);

/**
 * @brief Stop the WiFi Access Point.
 * @return ESP_OK on success.
 */
esp_err_t wifi_ap_stop(void);

/**
 * @brief Return number of stations currently connected to the AP.
 */
uint8_t wifi_ap_get_client_count(void);

/**
 * @brief Return true if the AP is running.
 */
bool wifi_ap_is_active(void);

#endif // WIFI_AP_H
