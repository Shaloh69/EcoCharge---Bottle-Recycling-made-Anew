#include "api_client.h"
#include "config.h"
#include "relay_control.h"
#include "conveyor_motor.h"
#include "sensor_monitor.h"
#include "ultrasonic.h"
#include "bottle_fsm.h"
#include "esp_http_client.h"
#include "esp_crt_bundle.h"
#include "esp_log.h"
#include <string.h>
#include <stdio.h>

#define JSON_BUF_SIZE   1024
#define RESP_BUF_SIZE   2048

// Split RENDER_BASE_URL into host + port so we never pass a full https:// URL
// through esp_http_client's URL parser (it miscuts the hostname).
#define RENDER_HOST  "ecocharge-server.onrender.com"
#define RENDER_PORT  443

// ---------------------------------------------------------------------------
// HTTP response accumulator
// ---------------------------------------------------------------------------
typedef struct {
    char   *buf;
    int     len;
    int     cap;
} resp_ctx_t;

static esp_err_t _http_event(esp_http_client_event_t *evt)
{
    resp_ctx_t *ctx = (resp_ctx_t *)evt->user_data;
    if (!ctx) return ESP_OK;

    if (evt->event_id == HTTP_EVENT_ON_DATA) {
        int space = ctx->cap - ctx->len - 1;
        if (space > 0) {
            int copy = evt->data_len < space ? evt->data_len : space;
            memcpy(ctx->buf + ctx->len, evt->data, copy);
            ctx->len += copy;
            ctx->buf[ctx->len] = '\0';
        }
    }
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// Build a base client config — host/port/SSL only, caller sets path + method.
// Using host+port bypasses esp_http_client's URL parser which mishandles
// the https:// scheme and produces ":hostname" instead of "hostname".
// ---------------------------------------------------------------------------
static esp_http_client_config_t _base_cfg(const char *path, resp_ctx_t *ctx,
                                           int timeout_ms)
{
    esp_http_client_config_t cfg = {
        .host              = RENDER_HOST,
        .port              = RENDER_PORT,
        .path              = path,
        .transport_type    = HTTP_TRANSPORT_OVER_SSL,
        .crt_bundle_attach = esp_crt_bundle_attach,
        .event_handler     = _http_event,
        .user_data         = ctx,
        .timeout_ms        = timeout_ms,
    };
    return cfg;
}

// ---------------------------------------------------------------------------
// Execute a single command received from the server.
// ---------------------------------------------------------------------------
static void _execute_command(int id, const char *cmd_type, const char *payload_json)
{
    ESP_LOGI(LOG_TAG, "Execute cmd id=%d type=%s", id, cmd_type);

    if (strcmp(cmd_type, "activate_port") == 0) {
        int port = 0;
        unsigned long dur = 0;
        sscanf(payload_json, "{\"port\":%d,\"duration_seconds\":%lu}", &port, &dur);
        if (port >= 1 && port <= NUM_CHARGING_PORTS) {
            relay_enable_port((uint8_t)port, (uint32_t)dur);
        }

    } else if (strcmp(cmd_type, "deactivate_port") == 0) {
        int port = 0;
        sscanf(payload_json, "{\"port\":%d}", &port);
        if (port >= 1 && port <= NUM_CHARGING_PORTS) {
            relay_disable_port((uint8_t)port);
        }

    } else if (strcmp(cmd_type, "open_conveyor") == 0) {
        conveyor_forward();

    } else if (strcmp(cmd_type, "close_conveyor") == 0) {
        conveyor_stop();

    } else if (strcmp(cmd_type, "reverse_conveyor") == 0) {
        conveyor_reverse();

    } else if (strcmp(cmd_type, "approve_bottle") == 0) {
        bottle_fsm_approve();

    } else if (strcmp(cmd_type, "reject_bottle") == 0) {
        bottle_fsm_reject();

    } else if (strcmp(cmd_type, "ping") == 0) {
        ESP_LOGI(LOG_TAG, "Ping received — kiosk alive");

    } else {
        ESP_LOGW(LOG_TAG, "Unknown command type: %s", cmd_type);
    }
}

// ---------------------------------------------------------------------------
// Ack a command. POST /api/devices/commands/{id}/ack
// ---------------------------------------------------------------------------
static void _ack_command(int id)
{
    char path[128];
    snprintf(path, sizeof(path), "/api/devices/commands/%d/ack", id);

    char resp_buf[256] = {0};
    resp_ctx_t ctx = { .buf = resp_buf, .len = 0, .cap = sizeof(resp_buf) };

    esp_http_client_config_t cfg = _base_cfg(path, &ctx, 10000);
    cfg.method = HTTP_METHOD_POST;

    esp_http_client_handle_t client = esp_http_client_init(&cfg);
    esp_http_client_set_header(client, "Authorization", "Bearer " DEVICE_API_KEY);
    esp_http_client_set_header(client, "Content-Length", "0");

    esp_err_t ret    = esp_http_client_perform(client);
    int        status = esp_http_client_get_status_code(client);
    esp_http_client_cleanup(client);

    if (ret != ESP_OK) {
        ESP_LOGW(LOG_TAG, "Ack cmd %d failed: %s", id, esp_err_to_name(ret));
    } else if (status != 200) {
        ESP_LOGW(LOG_TAG, "Ack cmd %d: HTTP %d", id, status);
    } else {
        ESP_LOGI(LOG_TAG, "Ack cmd %d OK", id);
    }
}

// ---------------------------------------------------------------------------
// Parse {"commands":[...]} and execute + ack each entry.
// ---------------------------------------------------------------------------
static void _parse_and_execute_commands(const char *json)
{
    const char *arr_start = strstr(json, "\"commands\":[");
    if (!arr_start) return;
    arr_start = strchr(arr_start, '[');
    if (!arr_start) return;
    arr_start++;

    const char *p = arr_start;
    while (*p && *p != ']') {
        const char *obj_start = strchr(p, '{');
        if (!obj_start || *obj_start == ']') break;

        int id = 0;
        const char *id_pos = strstr(obj_start, "\"id\":");
        if (id_pos) sscanf(id_pos + 5, "%d", &id);

        char cmd_type[64] = {0};
        const char *ct_pos = strstr(obj_start, "\"command_type\":\"");
        if (ct_pos) {
            ct_pos += strlen("\"command_type\":\"");
            int i = 0;
            while (*ct_pos && *ct_pos != '"' && i < (int)sizeof(cmd_type) - 1) {
                cmd_type[i++] = *ct_pos++;
            }
        }

        char payload_json[256] = "{}";
        const char *pl_pos = strstr(obj_start, "\"payload\":");
        if (pl_pos) {
            pl_pos += strlen("\"payload\":");
            if (*pl_pos == '{') {
                int depth = 0, i = 0;
                while (*pl_pos && i < (int)sizeof(payload_json) - 1) {
                    if (*pl_pos == '{') depth++;
                    else if (*pl_pos == '}') depth--;
                    payload_json[i++] = *pl_pos++;
                    if (depth == 0) break;
                }
                payload_json[i] = '\0';
            }
        }

        if (id > 0 && cmd_type[0]) {
            _execute_command(id, cmd_type, payload_json);
            _ack_command(id);
        }

        const char *obj_end = strchr(obj_start, '}');
        if (!obj_end) break;
        p = obj_end + 1;
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
esp_err_t api_client_init(void)
{
    ESP_LOGI(LOG_TAG, "API client ready. Target: %s:%d", RENDER_HOST, RENDER_PORT);
    return ESP_OK;
}

esp_err_t api_client_poll_commands(void)
{
    char path[128];
    snprintf(path, sizeof(path), "/api/devices/commands?kiosk_id=%d", KIOSK_ID);

    char resp_buf[RESP_BUF_SIZE] = {0};
    resp_ctx_t ctx = { .buf = resp_buf, .len = 0, .cap = RESP_BUF_SIZE };

    esp_http_client_config_t cfg = _base_cfg(path, &ctx, 5000);
    cfg.method = HTTP_METHOD_GET;

    esp_http_client_handle_t client = esp_http_client_init(&cfg);
    esp_http_client_set_header(client, "Authorization", "Bearer " DEVICE_API_KEY);

    esp_err_t ret    = esp_http_client_perform(client);
    int        status = esp_http_client_get_status_code(client);
    esp_http_client_cleanup(client);

    if (ret != ESP_OK) {
        ESP_LOGW(LOG_TAG, "Poll commands failed: %s", esp_err_to_name(ret));
        return ret;
    }
    if (status != 200) {
        ESP_LOGW(LOG_TAG, "Poll commands: HTTP %d — %s", status,
                 status == 401 ? "unauthorized (check DEVICE_API_KEY)" :
                 status == 404 ? "kiosk not found" : "server error");
        return ESP_FAIL;
    }
    if (ctx.len > 0) {
        _parse_and_execute_commands(resp_buf);
    }
    return ESP_OK;
}

esp_err_t api_client_post_telemetry(void)
{
    char body[JSON_BUF_SIZE];
    int  n = 0;

    n += snprintf(body + n, sizeof(body) - n,
                  "{\"kiosk_id\":%d,\"ports\":[", KIOSK_ID);

    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        port_sensor_data_t d = {0};
        sensor_get_port(i + 1, &d);

        n += snprintf(body + n, sizeof(body) - n,
                      "{\"port\":%d,\"current\":%.2f,\"voltage\":%.1f,"
                      "\"relay_on\":%s,\"overcurrent\":%s}",
                      d.port,
                      d.current_amps,
                      d.voltage_volts,
                      d.relay_on    ? "true" : "false",
                      d.overcurrent ? "true" : "false");

        if (i < NUM_CHARGING_PORTS - 1) body[n++] = ',';
    }

    ultrasonic_data_t us = ultrasonic_get();
    n += snprintf(body + n, sizeof(body) - n,
                  "],\"ultrasonic\":{"
                  "\"entrance_cm\":%.1f,"
                  "\"bin_top_cm\":%.1f,"
                  "\"bin_bot_cm\":%.1f},",
                  us.entrance_cm, us.bin_top_cm, us.bin_bot_cm);

    n += snprintf(body + n, sizeof(body) - n,
                  "\"bottle_at_entrance\":%s,"
                  "\"bottle_in_bin\":%s,"
                  "\"fsm_state\":\"%s\","
                  "\"bin_level\":-1}",
                  ultrasonic_bottle_at_entrance() ? "true" : "false",
                  bottle_fsm_bin_confirmed()      ? "true" : "false",
                  bottle_fsm_state_str());
    body[n] = '\0';

    char resp_buf[256] = {0};
    resp_ctx_t ctx = { .buf = resp_buf, .len = 0, .cap = sizeof(resp_buf) };

    esp_http_client_config_t cfg = _base_cfg("/api/devices/telemetry", &ctx, 5000);
    cfg.method = HTTP_METHOD_POST;

    esp_http_client_handle_t client = esp_http_client_init(&cfg);
    esp_http_client_set_header(client, "Authorization", "Bearer " DEVICE_API_KEY);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_post_field(client, body, n);

    esp_err_t ret    = esp_http_client_perform(client);
    int        status = esp_http_client_get_status_code(client);
    esp_http_client_cleanup(client);

    if (ret != ESP_OK) {
        ESP_LOGW(LOG_TAG, "Telemetry post failed: %s", esp_err_to_name(ret));
        return ret;
    }
    if (status != 200) {
        ESP_LOGW(LOG_TAG, "Telemetry: HTTP %d", status);
        return ESP_FAIL;
    }
    return ESP_OK;
}
