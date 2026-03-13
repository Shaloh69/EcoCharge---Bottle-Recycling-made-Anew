#ifndef WIFI_AP_H
#define WIFI_AP_H

#include "esp_err.h"
#include <stdbool.h>

// ============================================================================
// EcoCharge WiFi Access Point - Header
// ============================================================================

// WiFi AP Configuration
#define WIFI_AP_SSID            "EcoCharge-Motor"
#define WIFI_AP_PASSWORD        "motor123"        // Minimum 8 characters
#define WIFI_AP_CHANNEL         1
#define WIFI_AP_MAX_CONNECTIONS 4
#define WIFI_AP_BEACON_INTERVAL 100

// AP IP Configuration
#define AP_IP_ADDR              "192.168.4.1"
#define AP_GATEWAY_ADDR         "192.168.4.1"
#define AP_NETMASK_ADDR         "255.255.255.0"

// ----------------------------------------------------------------------------
// WiFi AP Functions
// ----------------------------------------------------------------------------

/**
 * @brief Initialize WiFi in Access Point mode
 *
 * Creates a WiFi hotspot that devices can connect to.
 * SSID: EcoCharge-Motor
 * Password: motor123
 * IP Address: 192.168.4.1
 *
 * @return ESP_OK on success, ESP_ERR_* on failure
 */
esp_err_t wifi_ap_init(void);

/**
 * @brief Stop WiFi Access Point
 *
 * @return ESP_OK on success
 */
esp_err_t wifi_ap_stop(void);

/**
 * @brief Get number of connected clients
 *
 * @return Number of devices connected to AP
 */
uint8_t wifi_ap_get_client_count(void);

/**
 * @brief Check if WiFi AP is running
 *
 * @return true if AP is active, false otherwise
 */
bool wifi_ap_is_active(void);

#endif // WIFI_AP_H
