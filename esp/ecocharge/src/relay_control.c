#include "relay_control.h"
#include "config.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

// GPIO for each port (index 0 = port 1)
static const int RELAY_GPIO[NUM_CHARGING_PORTS] = {
    RELAY_PORT1_GPIO,
    RELAY_PORT2_GPIO,
    RELAY_PORT3_GPIO,
    RELAY_PORT4_GPIO,
};

typedef struct {
    int      active;
    uint32_t duration_seconds;  // 0 = unlimited
    TickType_t start_tick;
} relay_state_t;

static relay_state_t s_relays[NUM_CHARGING_PORTS] = {0};

esp_err_t relay_init(void)
{
    gpio_config_t cfg = {
        .mode         = GPIO_MODE_OUTPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
        .pin_bit_mask = 0,
    };

    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        cfg.pin_bit_mask = (1ULL << RELAY_GPIO[i]);
        esp_err_t ret = gpio_config(&cfg);
        if (ret != ESP_OK) {
            ESP_LOGE(LOG_TAG, "Relay GPIO %d config failed: %s",
                     RELAY_GPIO[i], esp_err_to_name(ret));
            return ret;
        }
        // Ensure relay is OFF on startup
        gpio_set_level(RELAY_GPIO[i], !RELAY_ACTIVE_LEVEL);
        s_relays[i].active = 0;
    }

    ESP_LOGI(LOG_TAG, "Relay control initialized — all ports OFF");
    return ESP_OK;
}

esp_err_t relay_enable_port(uint8_t port, uint32_t duration_seconds)
{
    if (port < 1 || port > NUM_CHARGING_PORTS) {
        ESP_LOGE(LOG_TAG, "relay_enable_port: invalid port %d", port);
        return ESP_ERR_INVALID_ARG;
    }

    int idx = port - 1;

    // Cap duration to safety maximum
    if (duration_seconds > RELAY_MAX_ON_SEC) {
        ESP_LOGW(LOG_TAG, "Port %d: duration %lu capped to %d s",
                 port, (unsigned long)duration_seconds, RELAY_MAX_ON_SEC);
        duration_seconds = RELAY_MAX_ON_SEC;
    }

    gpio_set_level(RELAY_GPIO[idx], RELAY_ACTIVE_LEVEL);
    s_relays[idx].active           = 1;
    s_relays[idx].duration_seconds = duration_seconds;
    s_relays[idx].start_tick       = xTaskGetTickCount();

    ESP_LOGI(LOG_TAG, "Port %d ENABLED (duration=%lu s)", port, (unsigned long)duration_seconds);
    return ESP_OK;
}

esp_err_t relay_disable_port(uint8_t port)
{
    if (port < 1 || port > NUM_CHARGING_PORTS) {
        return ESP_ERR_INVALID_ARG;
    }

    int idx = port - 1;
    gpio_set_level(RELAY_GPIO[idx], !RELAY_ACTIVE_LEVEL);
    s_relays[idx].active = 0;

    ESP_LOGI(LOG_TAG, "Port %d DISABLED", port);
    return ESP_OK;
}

void relay_disable_all(void)
{
    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        gpio_set_level(RELAY_GPIO[i], !RELAY_ACTIVE_LEVEL);
        s_relays[i].active = 0;
    }
    ESP_LOGW(LOG_TAG, "All relay ports DISABLED (emergency stop)");
}

int relay_port_is_active(uint8_t port)
{
    if (port < 1 || port > NUM_CHARGING_PORTS) return 0;
    return s_relays[port - 1].active;
}

uint32_t relay_port_elapsed_ms(uint8_t port)
{
    if (port < 1 || port > NUM_CHARGING_PORTS) return 0;
    int idx = port - 1;
    if (!s_relays[idx].active) return 0;
    return pdTICKS_TO_MS(xTaskGetTickCount() - s_relays[idx].start_tick);
}

void relay_check_timeouts(void)
{
    TickType_t now = xTaskGetTickCount();
    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        if (!s_relays[i].active) continue;
        if (s_relays[i].duration_seconds == 0) continue;  // unlimited

        uint32_t elapsed_s = pdTICKS_TO_MS(now - s_relays[i].start_tick) / 1000;
        if (elapsed_s >= s_relays[i].duration_seconds) {
            ESP_LOGI(LOG_TAG, "Port %d timeout expired (%lu s) — disabling", i + 1,
                     (unsigned long)s_relays[i].duration_seconds);
            gpio_set_level(RELAY_GPIO[i], !RELAY_ACTIVE_LEVEL);
            s_relays[i].active = 0;
        }
    }
}
