#ifndef WIFI_PROVISION_H
#define WIFI_PROVISION_H

// ============================================================================
// EcoCharge WiFi Provisioning — Captive Portal
//
// Starts a lightweight DNS server (UDP port 53) that replies to every query
// with an A record pointing to 192.168.4.1.  Combined with the AP mode and
// the web_server, this causes iOS/Android to auto-open the browser on the
// /provision configuration page.
//
// Call after wifi_ap_init() and before web_server_start().
// ============================================================================

#include "esp_err.h"
#include <stdbool.h>

/**
 * @brief Start the captive-portal DNS server task.
 * @return ESP_OK on success.
 */
esp_err_t wifi_provision_start(void);

/**
 * @brief Stop the DNS server task (sets the run flag to false; task exits
 *        within 1 second on its next receive timeout).
 */
esp_err_t wifi_provision_stop(void);

/**
 * @brief Return true while the DNS task is running.
 */
bool wifi_provision_is_active(void);

#endif // WIFI_PROVISION_H
