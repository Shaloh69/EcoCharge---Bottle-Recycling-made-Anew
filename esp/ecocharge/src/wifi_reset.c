#include "wifi_reset.h"
#include "config.h"
#include "nvs_config.h"

#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_system.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include <stdbool.h>

static const char *TAG = LOG_TAG;

bool wifi_reset_button_is_pressed(void)
{
    return gpio_get_level(WIFI_RESET_BTN_GPIO) == WIFI_RESET_ACTIVE_LEVEL;
}

/**
 * Poll the button every WIFI_RESET_POLL_MS.
 *
 * Polling rather than an ISR on purpose: this is a human-scale event with a
 * multi-second hold requirement, so an interrupt buys nothing, and polling
 * gives debouncing for free — a contact bounce simply looks like one or two
 * odd samples inside a hold that has to last WIFI_RESET_HOLD_MS to count.
 * The counter resets the moment the button is seen released, so a tap, a
 * knock, or electrical noise can never accumulate toward the threshold.
 */
static void wifi_reset_task(void *arg)
{
    (void)arg;
    uint32_t held_ms = 0;
    bool     armed   = true;

    // If the button is already down at boot, ignore it until it is released
    // once. Otherwise a physically stuck (or jammed-in-shipping) button would
    // wipe the credentials on every single power-on, which would look exactly
    // like "the kiosk keeps forgetting its WiFi" and be miserable to diagnose.
    if (wifi_reset_button_is_pressed()) {
        ESP_LOGW(TAG, "WiFi reset button already held at boot — ignoring until released");
        armed = false;
    }

    for (;;) {
        const bool pressed = wifi_reset_button_is_pressed();

        if (!armed) {
            if (!pressed) {
                armed = true;
                ESP_LOGI(TAG, "WiFi reset button released — now armed");
            }
            vTaskDelay(pdMS_TO_TICKS(WIFI_RESET_POLL_MS));
            continue;
        }

        if (pressed) {
            held_ms += WIFI_RESET_POLL_MS;

            // One log line per second of hold, so a technician watching the
            // serial console can see the countdown actually progressing.
            if (held_ms % 1000 == 0) {
                ESP_LOGW(TAG, "WiFi reset button held %lu ms / %d ms",
                         (unsigned long)held_ms, WIFI_RESET_HOLD_MS);
            }

            if (held_ms >= WIFI_RESET_HOLD_MS) {
                ESP_LOGW(TAG, "WiFi reset TRIGGERED — erasing stored credentials");

                esp_err_t ret = nvs_config_clear_wifi();
                if (ret != ESP_OK) {
                    // Do not reboot on failure: rebooting would drop the kiosk
                    // offline for nothing and lose the log line explaining why.
                    ESP_LOGE(TAG, "Failed to clear WiFi credentials: %s — NOT rebooting",
                             esp_err_to_name(ret));
                    held_ms = 0;
                    armed   = false;   // require a release before trying again
                    continue;
                }

                ESP_LOGW(TAG, "Credentials erased — rebooting into provisioning AP");
                vTaskDelay(pdMS_TO_TICKS(200));   // let the UART flush
                esp_restart();
            }
        } else {
            if (held_ms > 0) {
                ESP_LOGI(TAG, "WiFi reset button released after %lu ms — cancelled",
                         (unsigned long)held_ms);
            }
            held_ms = 0;
        }

        vTaskDelay(pdMS_TO_TICKS(WIFI_RESET_POLL_MS));
    }
}

esp_err_t wifi_reset_button_init(void)
{
    gpio_config_t cfg = {
        .pin_bit_mask = 1ULL << WIFI_RESET_BTN_GPIO,
        .mode         = GPIO_MODE_INPUT,
        // Internal pull-up means the button needs no external resistor —
        // just two wires, pin to GND.
        .pull_up_en   = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };

    esp_err_t ret = gpio_config(&cfg);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "WiFi reset button GPIO config failed: %s", esp_err_to_name(ret));
        return ret;
    }

    BaseType_t ok = xTaskCreate(wifi_reset_task, "wifi_reset",
                                WIFI_RESET_TASK_STACK, NULL,
                                WIFI_RESET_TASK_PRIO, NULL);
    if (ok != pdPASS) {
        ESP_LOGE(TAG, "WiFi reset task create failed");
        return ESP_ERR_NO_MEM;
    }

    ESP_LOGI(TAG, "WiFi reset button ready on GPIO%d (hold %d ms to erase credentials)",
             WIFI_RESET_BTN_GPIO, WIFI_RESET_HOLD_MS);
    return ESP_OK;
}
