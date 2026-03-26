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
