#include "web_server.h"
#include "motor_control.h"
#include "config.h"
#include "esp_log.h"
#include "esp_http_server.h"
#include "cJSON.h"
#include <string.h>

// ============================================================================
// EcoCharge Web Server - Implementation
// ============================================================================

static httpd_handle_t server = NULL;

// ----------------------------------------------------------------------------
// HTML/CSS/JS Web Interface
// ----------------------------------------------------------------------------

static const char* html_page =
"<!DOCTYPE html>"
"<html>"
"<head>"
"<meta charset='UTF-8'>"
"<meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'>"
"<title>EcoCharge Motor Control</title>"
"<style>"
"* { margin: 0; padding: 0; box-sizing: border-box; }"
"body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }"
".container { max-width: 500px; margin: 0 auto; }"
".header { background: white; border-radius: 20px; padding: 25px; margin-bottom: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; }"
".header h1 { color: #667eea; font-size: 28px; margin-bottom: 5px; }"
".header p { color: #666; font-size: 14px; }"
".status-card { background: white; border-radius: 20px; padding: 25px; margin-bottom: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }"
".status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }"
".status-item { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 12px; }"
".status-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }"
".status-value { font-size: 24px; font-weight: bold; color: #667eea; }"
".status-state { font-size: 18px; font-weight: bold; padding: 12px; border-radius: 12px; margin-top: 15px; text-align: center; }"
".state-stopped { background: #e9ecef; color: #495057; }"
".state-forward { background: #d4edda; color: #155724; }"
".state-backward { background: #fff3cd; color: #856404; }"
".control-section { background: white; border-radius: 20px; padding: 25px; margin-bottom: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }"
".section-title { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 15px; }"
".button-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }"
".btn { padding: 18px; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }"
".btn:active { transform: scale(0.95); }"
".btn-forward { background: #28a745; color: white; }"
".btn-forward:hover { background: #218838; }"
".btn-backward { background: #ffc107; color: #333; }"
".btn-backward:hover { background: #e0a800; }"
".btn-stop { background: #dc3545; color: white; grid-column: span 2; }"
".btn-stop:hover { background: #c82333; }"
".btn-timed { background: #17a2b8; color: white; font-size: 14px; padding: 15px; }"
".btn-timed:hover { background: #138496; }"
".speed-control { margin-top: 20px; }"
".speed-slider { width: 100%; height: 8px; border-radius: 5px; outline: none; -webkit-appearance: none; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); }"
".speed-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; background: white; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }"
".speed-slider::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: white; cursor: pointer; border: none; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }"
".speed-display { text-align: center; font-size: 32px; font-weight: bold; color: #667eea; margin: 15px 0 10px 0; }"
".footer { text-align: center; color: white; font-size: 14px; margin-top: 20px; opacity: 0.9; }"
"</style>"
"</head>"
"<body>"
"<div class='container'>"
"<div class='header'>"
"<h1>🔋 EcoCharge</h1>"
"<p>Motor Control System</p>"
"</div>"
"<div class='status-card'>"
"<div class='section-title'>Motor Status</div>"
"<div class='status-state state-stopped' id='stateDisplay'>STOPPED</div>"
"<div class='status-grid'>"
"<div class='status-item'>"
"<div class='status-label'>Speed</div>"
"<div class='status-value' id='speedDisplay'>50%</div>"
"</div>"
"<div class='status-item'>"
"<div class='status-label'>Runtime</div>"
"<div class='status-value' id='runtimeDisplay'>0s</div>"
"</div>"
"</div>"
"</div>"
"<div class='control-section'>"
"<div class='section-title'>Direction Control</div>"
"<div class='button-grid'>"
"<button class='btn btn-forward' onclick='moveForward()'>⬆️ Forward</button>"
"<button class='btn btn-backward' onclick='moveBackward()'>⬇️ Backward</button>"
"<button class='btn btn-stop' onclick='stopMotor()'>🛑 STOP</button>"
"</div>"
"<div class='section-title' style='margin-top: 25px;'>Timed Operations</div>"
"<div class='button-grid'>"
"<button class='btn btn-timed' onclick='moveTimedForward(3)'>⏱️ FWD 3s</button>"
"<button class='btn btn-timed' onclick='moveTimedForward(5)'>⏱️ FWD 5s</button>"
"<button class='btn btn-timed' onclick='moveTimedBackward(3)'>⏱️ BWD 3s</button>"
"<button class='btn btn-timed' onclick='moveTimedBackward(5)'>⏱️ BWD 5s</button>"
"<button class='btn btn-timed' onclick='moveTimedForward(10)'>⏱️ FWD 10s</button>"
"<button class='btn btn-timed' onclick='moveTimedBackward(10)'>⏱️ BWD 10s</button>"
"</div>"
"</div>"
"<div class='control-section'>"
"<div class='section-title'>Speed Control</div>"
"<div class='speed-display' id='speedSliderDisplay'>50%</div>"
"<input type='range' min='20' max='100' value='50' class='speed-slider' id='speedSlider' oninput='updateSpeedDisplay(this.value)'>"
"<div class='speed-control'>"
"<button class='btn' style='width: 100%; background: #6c757d; color: white;' onclick='setSpeed()'>Set Speed</button>"
"</div>"
"</div>"
"<div class='footer'>Wi-Fi: EcoCharge-Motor<br>IP: 192.168.4.1</div>"
"</div>"
"<script>"
"let currentSpeed = 50;"
"function updateSpeedDisplay(value) {"
"  document.getElementById('speedSliderDisplay').textContent = value + '%';"
"  currentSpeed = value;"
"}"
"async function apiCall(endpoint, data = {}) {"
"  try {"
"    const response = await fetch(endpoint, {"
"      method: 'POST',"
"      headers: { 'Content-Type': 'application/json' },"
"      body: JSON.stringify(data)"
"    });"
"    const result = await response.json();"
"    console.log(result);"
"    updateStatus();"
"    return result;"
"  } catch (error) {"
"    console.error('API Error:', error);"
"  }"
"}"
"async function moveForward() {"
"  await apiCall('/api/motor/forward', { speed: currentSpeed });"
"}"
"async function moveBackward() {"
"  await apiCall('/api/motor/backward', { speed: currentSpeed });"
"}"
"async function stopMotor() {"
"  await apiCall('/api/motor/stop');"
"}"
"async function moveTimedForward(seconds) {"
"  await apiCall('/api/motor/forward', { speed: currentSpeed, duration: seconds * 1000 });"
"}"
"async function moveTimedBackward(seconds) {"
"  await apiCall('/api/motor/backward', { speed: currentSpeed, duration: seconds * 1000 });"
"}"
"async function setSpeed() {"
"  await apiCall('/api/motor/speed', { speed: currentSpeed });"
"  alert('Speed set to ' + currentSpeed + '%');"
"}"
"async function updateStatus() {"
"  try {"
"    const response = await fetch('/api/motor/status');"
"    const data = await response.json();"
"    const stateDisplay = document.getElementById('stateDisplay');"
"    const states = { 0: 'STOPPED', 1: 'FORWARD', 2: 'BACKWARD' };"
"    const stateClasses = { 0: 'state-stopped', 1: 'state-forward', 2: 'state-backward' };"
"    stateDisplay.textContent = states[data.state] || 'UNKNOWN';"
"    stateDisplay.className = 'status-state ' + (stateClasses[data.state] || 'state-stopped');"
"    document.getElementById('speedDisplay').textContent = data.speed + '%';"
"    document.getElementById('runtimeDisplay').textContent = (data.runtime_ms / 1000).toFixed(1) + 's';"
"  } catch (error) {"
"    console.error('Status Error:', error);"
"  }"
"}"
"setInterval(updateStatus, 500);"
"updateStatus();"
"</script>"
"</body>"
"</html>";

// ----------------------------------------------------------------------------
// HTTP Request Handlers
// ----------------------------------------------------------------------------

// Root handler - serves HTML page
static esp_err_t root_handler(httpd_req_t *req) {
    httpd_resp_set_type(req, "text/html");
    httpd_resp_send(req, html_page, strlen(html_page));
    return ESP_OK;
}

// Status endpoint - returns motor status as JSON
static esp_err_t status_handler(httpd_req_t *req) {
    motor_status_t status;
    motor_get_status(&status);

    cJSON *root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "state", status.state);
    cJSON_AddNumberToObject(root, "speed", status.speed);
    cJSON_AddNumberToObject(root, "runtime_ms", status.runtime_ms);
    cJSON_AddBoolToObject(root, "is_running", status.is_running);
    cJSON_AddBoolToObject(root, "timeout", status.timeout_occurred);

    const char *json_str = cJSON_Print(root);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_send(req, json_str, strlen(json_str));

    free((void *)json_str);
    cJSON_Delete(root);
    return ESP_OK;
}

// Forward endpoint
static esp_err_t forward_handler(httpd_req_t *req) {
    char content[100];
    int ret = httpd_req_recv(req, content, sizeof(content));
    if (ret <= 0) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    content[ret] = '\0';
    cJSON *json = cJSON_Parse(content);
    if (json == NULL) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    int speed = cJSON_GetObjectItem(json, "speed")->valueint;
    cJSON *duration_item = cJSON_GetObjectItem(json, "duration");

    motor_forward(speed);

    // If duration specified, schedule stop
    if (duration_item != NULL) {
        int duration_ms = duration_item->valueint;
        ESP_LOGI(LOG_TAG, "Timed forward: %d%% for %dms", speed, duration_ms);
    }

    cJSON_Delete(json);

    cJSON *response = cJSON_CreateObject();
    cJSON_AddStringToObject(response, "status", "ok");
    cJSON_AddStringToObject(response, "command", "forward");

    const char *json_str = cJSON_Print(response);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_send(req, json_str, strlen(json_str));

    free((void *)json_str);
    cJSON_Delete(response);
    return ESP_OK;
}

// Backward endpoint
static esp_err_t backward_handler(httpd_req_t *req) {
    char content[100];
    int ret = httpd_req_recv(req, content, sizeof(content));
    if (ret <= 0) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    content[ret] = '\0';
    cJSON *json = cJSON_Parse(content);
    if (json == NULL) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    int speed = cJSON_GetObjectItem(json, "speed")->valueint;
    cJSON *duration_item = cJSON_GetObjectItem(json, "duration");

    motor_backward(speed);

    // If duration specified, schedule stop
    if (duration_item != NULL) {
        int duration_ms = duration_item->valueint;
        ESP_LOGI(LOG_TAG, "Timed backward: %d%% for %dms", speed, duration_ms);
    }

    cJSON_Delete(json);

    cJSON *response = cJSON_CreateObject();
    cJSON_AddStringToObject(response, "status", "ok");
    cJSON_AddStringToObject(response, "command", "backward");

    const char *json_str = cJSON_Print(response);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_send(req, json_str, strlen(json_str));

    free((void *)json_str);
    cJSON_Delete(response);
    return ESP_OK;
}

// Stop endpoint
static esp_err_t stop_handler(httpd_req_t *req) {
    motor_stop();

    cJSON *response = cJSON_CreateObject();
    cJSON_AddStringToObject(response, "status", "ok");
    cJSON_AddStringToObject(response, "command", "stop");

    const char *json_str = cJSON_Print(response);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_send(req, json_str, strlen(json_str));

    free((void *)json_str);
    cJSON_Delete(response);
    return ESP_OK;
}

// Speed endpoint
static esp_err_t speed_handler(httpd_req_t *req) {
    char content[100];
    int ret = httpd_req_recv(req, content, sizeof(content));
    if (ret <= 0) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    content[ret] = '\0';
    cJSON *json = cJSON_Parse(content);
    if (json == NULL) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    int speed = cJSON_GetObjectItem(json, "speed")->valueint;
    motor_set_speed(speed);

    cJSON_Delete(json);

    cJSON *response = cJSON_CreateObject();
    cJSON_AddStringToObject(response, "status", "ok");
    cJSON_AddNumberToObject(response, "speed", speed);

    const char *json_str = cJSON_Print(response);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_send(req, json_str, strlen(json_str));

    free((void *)json_str);
    cJSON_Delete(response);
    return ESP_OK;
}

// ----------------------------------------------------------------------------
// URI Handlers Configuration
// ----------------------------------------------------------------------------

static const httpd_uri_t root_uri = {
    .uri       = "/",
    .method    = HTTP_GET,
    .handler   = root_handler,
    .user_ctx  = NULL
};

static const httpd_uri_t status_uri = {
    .uri       = "/api/motor/status",
    .method    = HTTP_GET,
    .handler   = status_handler,
    .user_ctx  = NULL
};

static const httpd_uri_t forward_uri = {
    .uri       = "/api/motor/forward",
    .method    = HTTP_POST,
    .handler   = forward_handler,
    .user_ctx  = NULL
};

static const httpd_uri_t backward_uri = {
    .uri       = "/api/motor/backward",
    .method    = HTTP_POST,
    .handler   = backward_handler,
    .user_ctx  = NULL
};

static const httpd_uri_t stop_uri = {
    .uri       = "/api/motor/stop",
    .method    = HTTP_POST,
    .handler   = stop_handler,
    .user_ctx  = NULL
};

static const httpd_uri_t speed_uri = {
    .uri       = "/api/motor/speed",
    .method    = HTTP_POST,
    .handler   = speed_handler,
    .user_ctx  = NULL
};

// ----------------------------------------------------------------------------
// Public Functions
// ----------------------------------------------------------------------------

esp_err_t web_server_start(void) {
    ESP_LOGI(LOG_TAG, "Starting web server...");

    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = WEB_SERVER_PORT;
    config.max_uri_handlers = 10;
    config.stack_size = 8192;

    if (httpd_start(&server, &config) == ESP_OK) {
        httpd_register_uri_handler(server, &root_uri);
        httpd_register_uri_handler(server, &status_uri);
        httpd_register_uri_handler(server, &forward_uri);
        httpd_register_uri_handler(server, &backward_uri);
        httpd_register_uri_handler(server, &stop_uri);
        httpd_register_uri_handler(server, &speed_uri);

        ESP_LOGI(LOG_TAG, "Web server started on port %d", WEB_SERVER_PORT);
        ESP_LOGI(LOG_TAG, "Open http://192.168.4.1 in your browser");
        return ESP_OK;
    }

    ESP_LOGE(LOG_TAG, "Failed to start web server");
    return ESP_FAIL;
}

esp_err_t web_server_stop(void) {
    if (server != NULL) {
        httpd_stop(server);
        server = NULL;
        ESP_LOGI(LOG_TAG, "Web server stopped");
        return ESP_OK;
    }
    return ESP_ERR_INVALID_STATE;
}

bool web_server_is_running(void) {
    return (server != NULL);
}
