#ifndef API_CLIENT_H
#define API_CLIENT_H

#include "esp_err.h"

/**
 * @brief Initialize the HTTP client (call once after WiFi connects).
 * @return ESP_OK on success.
 */
esp_err_t api_client_init(void);

/**
 * @brief Ping /health to wake the Render server (free tier cold start).
 *        Blocks until 200 OK or max attempts exceeded. Call before poll/telemetry tasks.
 * @return ESP_OK if server responded, ESP_FAIL if all attempts timed out.
 */
esp_err_t api_client_wake_server(void);

/**
 * @brief Poll the Render backend for pending commands and execute them.
 *        Sends a GET to /api/devices/commands and processes each command.
 * @return ESP_OK if poll succeeded (even if no commands), error otherwise.
 */
esp_err_t api_client_poll_commands(void);

/**
 * @brief Post current sensor telemetry to the backend.
 *        Sends port voltages, currents, relay states, and bin level.
 * @return ESP_OK if post succeeded, error otherwise.
 */
esp_err_t api_client_post_telemetry(void);

#endif // API_CLIENT_H
