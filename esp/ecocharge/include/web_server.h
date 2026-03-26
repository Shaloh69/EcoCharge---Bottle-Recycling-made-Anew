#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include "esp_err.h"
#include "esp_http_server.h"
#include <stdbool.h>

// ============================================================================
// EcoCharge Local Admin Web Server
// Accessible on the EcoCharge_Config AP network (192.168.4.1).
// Used for development, testing, and manual overrides only.
// Normal operation is driven by the Render backend via api_client.
// ============================================================================

/**
 * @brief Start the local admin web server on port 80.
 * @return ESP_OK on success.
 */
esp_err_t web_server_start(void);

/**
 * @brief Stop the local admin web server.
 * @return ESP_OK on success.
 */
esp_err_t web_server_stop(void);

/**
 * @brief Check if the web server is currently running.
 * @return true if running.
 */
bool web_server_is_running(void);

#endif // WEB_SERVER_H
