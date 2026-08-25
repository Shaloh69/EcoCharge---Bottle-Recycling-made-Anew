#ifndef NVS_CONFIG_H
#define NVS_CONFIG_H

// ============================================================================
// EcoCharge NVS Config — WiFi credential storage
// Namespace: "wifi_cfg"   Keys: "ssid", "pass"
// Call nvs_config_init() once after nvs_flash_init() in app_main.
// ============================================================================

#include <stdint.h>
#include <stddef.h>
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

// ---------------------------------------------------------------------------
// Backend host — runtime-configurable, added 2026-08-20.
//
// This exists because the backend URL is NOT stable: the kiosk is reached
// through a free Cloudflare quick tunnel whose hostname rotates every time the
// tunnel process restarts. Baking it in at compile time meant a URL change
// required physically retrieving the kiosk and reflashing it.
//
// It also fixed a real bug found the same day: api_client.c had a hardcoded
// `ecocharge-server-j7u7.onrender.com` and ignored config.h's RENDER_BASE_URL
// entirely, so every tunnel URL edit ever made to config.h was cosmetic and
// the firmware was still calling a host decommissioned months earlier.
//
// Precedence: NVS value if set, otherwise the RENDER_BASE_URL compile-time
// default. Store the BARE HOSTNAME only - no scheme, no path, no port.
// ---------------------------------------------------------------------------

/** True if a backend host has been stored in NVS. */
bool nvs_config_has_backend(void);

/**
 * Read the effective backend host into @p host_out.
 * Falls back to the RENDER_BASE_URL compile-time default (scheme stripped)
 * when nothing is stored, so this never returns an empty host.
 */
esp_err_t nvs_config_get_backend(char *host_out, size_t host_len, uint16_t *port_out);

/** Store a backend host (bare hostname) and port. */
esp_err_t nvs_config_set_backend(const char *host, uint16_t port);

/** Forget the stored backend host; the compile-time default applies again. */
esp_err_t nvs_config_clear_backend(void);

#endif // NVS_CONFIG_H
