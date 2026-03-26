#ifndef WIFI_STA_H
#define WIFI_STA_H

#include "esp_err.h"

/**
 * @brief Connect ESP32 to a WiFi access point (Station mode).
 *
 * Reads SSID/password from NVS if previously configured;
 * falls back to compile-time defaults from config.h.
 *
 * Blocks until connected or max retries exceeded.
 *
 * @return ESP_OK if connected, ESP_FAIL if unable to connect.
 */
esp_err_t wifi_sta_connect(void);

/**
 * @brief Check if WiFi is currently connected.
 * @return 1 if connected, 0 if disconnected.
 */
int wifi_sta_is_connected(void);

/**
 * @brief Disconnect and deinit WiFi.
 */
void wifi_sta_stop(void);

#endif // WIFI_STA_H
