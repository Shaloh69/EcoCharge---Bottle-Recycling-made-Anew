#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include "esp_err.h"
#include "esp_http_server.h"

// ============================================================================
// EcoCharge Web Server - Header
// ============================================================================

// Web Server Configuration
#define WEB_SERVER_PORT         80
#define WEB_SERVER_MAX_URI_LEN  128
#define WEB_SERVER_MAX_RESP_LEN 4096

// ----------------------------------------------------------------------------
// Web Server Functions
// ----------------------------------------------------------------------------

/**
 * @brief Start HTTP web server
 *
 * Starts a web server on port 80 that serves:
 * - Web UI at http://192.168.4.1/
 * - API endpoints for motor control
 *
 * @return ESP_OK on success, ESP_ERR_* on failure
 */
esp_err_t web_server_start(void);

/**
 * @brief Stop HTTP web server
 *
 * @return ESP_OK on success
 */
esp_err_t web_server_stop(void);

/**
 * @brief Check if web server is running
 *
 * @return true if server is active, false otherwise
 */
bool web_server_is_running(void);

#endif // WEB_SERVER_H
