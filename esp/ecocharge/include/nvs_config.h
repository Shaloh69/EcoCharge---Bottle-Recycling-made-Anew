#ifndef NVS_CONFIG_H
#define NVS_CONFIG_H

// ============================================================================
// EcoCharge NVS Config — WiFi credential storage
// Namespace: "wifi_cfg"   Keys: "ssid", "pass"
// Call nvs_config_init() once after nvs_flash_init() in app_main.
// ============================================================================

#include "esp_err.h"
#include <stdbool.h>
#include <stddef.h>

/**
 * @brief Log the NVS config module as ready. NVS flash must be initialised first.
 */
esp_err_t nvs_config_init(void);

/**
 * @brief Return true if a non-empty SSID is stored in NVS.
 */
bool nvs_config_has_wifi_creds(void);

/**
 * @brief Read stored WiFi credentials into caller-supplied buffers.
 * @return ESP_OK on success, ESP_ERR_NVS_NOT_FOUND if not stored.
 */
esp_err_t nvs_config_get_wifi(char *ssid_out, size_t ssid_len,
                               char *pass_out, size_t pass_len);

/**
 * @brief Write WiFi credentials to NVS. Commits immediately.
 */
esp_err_t nvs_config_set_wifi(const char *ssid, const char *pass);

/**
 * @brief Erase stored WiFi credentials from NVS.
 */
esp_err_t nvs_config_clear_wifi(void);

#endif // NVS_CONFIG_H
