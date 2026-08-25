#include "nvs_config.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "esp_log.h"
#include "config.h"
#include <string.h>

// ============================================================================
// EcoCharge NVS Config — WiFi credential persistence
// ============================================================================

#define NVS_NAMESPACE   "wifi_cfg"
#define NVS_KEY_SSID    "ssid"
#define NVS_KEY_PASS    "pass"

esp_err_t nvs_config_init(void)
{
    ESP_LOGI(LOG_TAG, "NVS config ready (namespace: %s)", NVS_NAMESPACE);
    return ESP_OK;
}

bool nvs_config_has_wifi_creds(void)
{
    nvs_handle_t h;
    if (nvs_open(NVS_NAMESPACE, NVS_READONLY, &h) != ESP_OK) {
        return false;
    }
    char ssid[64] = {0};
    size_t len = sizeof(ssid);
    esp_err_t ret = nvs_get_str(h, NVS_KEY_SSID, ssid, &len);
    nvs_close(h);
    // len includes null terminator, so a stored non-empty string has len >= 2
    return (ret == ESP_OK && len >= 2);
}

esp_err_t nvs_config_get_wifi(char *ssid_out, size_t ssid_len,
                               char *pass_out, size_t pass_len)
{
    nvs_handle_t h;
    esp_err_t ret = nvs_open(NVS_NAMESPACE, NVS_READONLY, &h);
    if (ret != ESP_OK) return ret;

    ret = nvs_get_str(h, NVS_KEY_SSID, ssid_out, &ssid_len);
    if (ret != ESP_OK) { nvs_close(h); return ret; }

    ret = nvs_get_str(h, NVS_KEY_PASS, pass_out, &pass_len);
    nvs_close(h);
    return ret;
}

esp_err_t nvs_config_set_wifi(const char *ssid, const char *pass)
{
    nvs_handle_t h;
    esp_err_t ret = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &h);
    if (ret != ESP_OK) return ret;

    ret = nvs_set_str(h, NVS_KEY_SSID, ssid);
    if (ret != ESP_OK) { nvs_close(h); return ret; }

    ret = nvs_set_str(h, NVS_KEY_PASS, pass);
    if (ret != ESP_OK) { nvs_close(h); return ret; }

    ret = nvs_commit(h);
    nvs_close(h);
    if (ret == ESP_OK) {
        ESP_LOGI(LOG_TAG, "WiFi credentials saved to NVS (SSID: %s)", ssid);
    }
    return ret;
}

esp_err_t nvs_config_clear_wifi(void)
{
    nvs_handle_t h;
    esp_err_t ret = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &h);
    if (ret != ESP_OK) return ret;

    nvs_erase_key(h, NVS_KEY_SSID);    // ignore error — key may not exist
    nvs_erase_key(h, NVS_KEY_PASS);
    ret = nvs_commit(h);
    nvs_close(h);
    ESP_LOGI(LOG_TAG, "WiFi credentials cleared from NVS");
    return ret;
}

// ============================================================================
// Backend host — runtime-configurable (added 2026-08-20)
// ============================================================================
// See nvs_config.h for the full reasoning. Short version: the backend lives
// behind a Cloudflare quick tunnel whose hostname rotates on every restart,
// and api_client.c used to hardcode a long-dead onrender.com host, so the
// firmware could not reach the real backend at all.

#define NVS_KEY_BE_HOST  "be_host"
#define NVS_KEY_BE_PORT  "be_port"

/**
 * Strip "https://" / "http://" and any trailing path or slash from a URL,
 * leaving a bare hostname. esp_http_client's .host field must not contain a
 * scheme — passing one produces a ":hostname" lookup that always fails, which
 * is the exact trap the original RENDER_HOST split was working around.
 */
static void _url_to_host(const char *url, char *out, size_t out_len)
{
    if (!url || !out || out_len == 0) return;

    const char *p = url;
    if (strncmp(p, "https://", 8) == 0)      p += 8;
    else if (strncmp(p, "http://", 7) == 0)  p += 7;

    size_t i = 0;
    while (p[i] && p[i] != '/' && p[i] != ':' && i < out_len - 1) {
        out[i] = p[i];
        i++;
    }
    out[i] = '\0';
}

bool nvs_config_has_backend(void)
{
    nvs_handle_t h;
    if (nvs_open(NVS_NAMESPACE, NVS_READONLY, &h) != ESP_OK) return false;

    char host[128] = {0};
    size_t len = sizeof(host);
    esp_err_t ret = nvs_get_str(h, NVS_KEY_BE_HOST, host, &len);
    nvs_close(h);
    return (ret == ESP_OK && len >= 2);
}

esp_err_t nvs_config_get_backend(char *host_out, size_t host_len, uint16_t *port_out)
{
    if (!host_out || host_len == 0) return ESP_ERR_INVALID_ARG;

    nvs_handle_t h;
    if (nvs_open(NVS_NAMESPACE, NVS_READONLY, &h) == ESP_OK) {
        size_t len = host_len;
        esp_err_t ret = nvs_get_str(h, NVS_KEY_BE_HOST, host_out, &len);
        if (ret == ESP_OK && len >= 2) {
            uint16_t port = 443;
            nvs_get_u16(h, NVS_KEY_BE_PORT, &port);   // absent -> keep 443
            nvs_close(h);
            if (port_out) *port_out = port;
            ESP_LOGI(LOG_TAG, "Backend host from NVS: %s:%u", host_out, port);
            return ESP_OK;
        }
        nvs_close(h);
    }

    // Nothing stored — fall back to the compile-time default so the kiosk is
    // never left with no backend at all.
    _url_to_host(RENDER_BASE_URL, host_out, host_len);
    if (port_out) *port_out = 443;
    ESP_LOGW(LOG_TAG, "No backend host in NVS — using compile-time default: %s", host_out);
    return ESP_OK;
}

esp_err_t nvs_config_set_backend(const char *host, uint16_t port)
{
    if (!host || !*host) return ESP_ERR_INVALID_ARG;

    // Accept a full URL and normalise it: a human pasting the tunnel URL from
    // a browser will include "https://", and storing that would silently break
    // every request. Normalising here means the portal can be forgiving.
    char clean[128] = {0};
    _url_to_host(host, clean, sizeof(clean));
    if (clean[0] == '\0') return ESP_ERR_INVALID_ARG;

    nvs_handle_t h;
    esp_err_t ret = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &h);
    if (ret != ESP_OK) return ret;

    ret = nvs_set_str(h, NVS_KEY_BE_HOST, clean);
    if (ret != ESP_OK) { nvs_close(h); return ret; }

    ret = nvs_set_u16(h, NVS_KEY_BE_PORT, port ? port : 443);
    if (ret != ESP_OK) { nvs_close(h); return ret; }

    ret = nvs_commit(h);
    nvs_close(h);
    if (ret == ESP_OK) {
        ESP_LOGI(LOG_TAG, "Backend host saved to NVS: %s:%u", clean, port ? port : 443);
    }
    return ret;
}

esp_err_t nvs_config_clear_backend(void)
{
    nvs_handle_t h;
    esp_err_t ret = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &h);
    if (ret != ESP_OK) return ret;

    nvs_erase_key(h, NVS_KEY_BE_HOST);
    nvs_erase_key(h, NVS_KEY_BE_PORT);
    ret = nvs_commit(h);
    nvs_close(h);
    ESP_LOGI(LOG_TAG, "Backend host cleared from NVS — compile-time default applies");
    return ret;
}
