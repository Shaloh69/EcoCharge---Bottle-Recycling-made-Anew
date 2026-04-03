#include "ultrasonic.h"
#include "config.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

// ============================================================================
// EcoCharge — HC-SR04 Ultrasonic Driver
//
// Measurement sequence per sensor:
//   1. Pull TRIG LOW for 2 µs  (ensure clean start)
//   2. Pull TRIG HIGH for 10 µs
//   3. Pull TRIG LOW
//   4. Wait for ECHO to go HIGH (start of pulse)
//   5. Measure time until ECHO goes LOW (end of pulse)
//   6. distance_cm = pulse_us * 0.0343 / 2
//
// Polling approach — no interrupts required. Safe to call from any task.
// ============================================================================

static ultrasonic_data_t s_data = { 400.0f, 400.0f, 400.0f };

// ---------------------------------------------------------------------------
// Internal: measure one sensor, returns distance in cm.
// Returns ULTRASONIC_MAX_DISTANCE_CM on timeout (no object or out of range).
// ---------------------------------------------------------------------------
static float _measure_cm(int trig_gpio, int echo_gpio)
{
    // --- Send 10 µs trigger pulse ---
    gpio_set_level(trig_gpio, 0);
    esp_rom_delay_us(2);
    gpio_set_level(trig_gpio, 1);
    esp_rom_delay_us(ULTRASONIC_TRIG_PULSE_US);
    gpio_set_level(trig_gpio, 0);

    // --- Wait for ECHO to go HIGH (start of return pulse) ---
    int64_t start_wait = esp_timer_get_time();
    while (gpio_get_level(echo_gpio) == 0) {
        if ((esp_timer_get_time() - start_wait) > ULTRASONIC_TIMEOUT_US) {
            return ULTRASONIC_MAX_DISTANCE_CM; // no echo — nothing in range
        }
    }

    // --- Measure ECHO HIGH duration ---
    int64_t pulse_start = esp_timer_get_time();
    while (gpio_get_level(echo_gpio) == 1) {
        if ((esp_timer_get_time() - pulse_start) > ULTRASONIC_TIMEOUT_US) {
            return ULTRASONIC_MAX_DISTANCE_CM; // pulse too long
        }
    }
    int64_t pulse_us = esp_timer_get_time() - pulse_start;

    // distance = (pulse_us * speed_of_sound) / 2
    // speed_of_sound ≈ 0.0343 cm/µs
    return (float)pulse_us * 0.0343f / 2.0f;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
esp_err_t ultrasonic_init(void)
{
    // TRIG pins — digital output, start LOW
    gpio_config_t trig_cfg = {
        .pin_bit_mask = (1ULL << ULTRASONIC_ENTRANCE_TRIG_GPIO) |
                        (1ULL << ULTRASONIC_BIN_TOP_TRIG_GPIO)  |
                        (1ULL << ULTRASONIC_BIN_BOT_TRIG_GPIO),
        .mode         = GPIO_MODE_OUTPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    esp_err_t ret = gpio_config(&trig_cfg);
    if (ret != ESP_OK) return ret;

    gpio_set_level(ULTRASONIC_ENTRANCE_TRIG_GPIO, 0);
    gpio_set_level(ULTRASONIC_BIN_TOP_TRIG_GPIO,  0);
    gpio_set_level(ULTRASONIC_BIN_BOT_TRIG_GPIO,  0);

    // ECHO pins — digital input, no pull (external voltage divider handles bias)
    gpio_config_t echo_cfg = {
        .pin_bit_mask = (1ULL << ULTRASONIC_ENTRANCE_ECHO_GPIO) |
                        (1ULL << ULTRASONIC_BIN_TOP_ECHO_GPIO)  |
                        (1ULL << ULTRASONIC_BIN_BOT_ECHO_GPIO),
        .mode         = GPIO_MODE_INPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    ret = gpio_config(&echo_cfg);
    if (ret != ESP_OK) return ret;

    ESP_LOGI(LOG_TAG, "Ultrasonic init — entrance T:%d/E:%d  bin_top T:%d/E:%d  bin_bot T:%d/E:%d",
             ULTRASONIC_ENTRANCE_TRIG_GPIO, ULTRASONIC_ENTRANCE_ECHO_GPIO,
             ULTRASONIC_BIN_TOP_TRIG_GPIO,  ULTRASONIC_BIN_TOP_ECHO_GPIO,
             ULTRASONIC_BIN_BOT_TRIG_GPIO,  ULTRASONIC_BIN_BOT_ECHO_GPIO);
    return ESP_OK;
}

void ultrasonic_read_all(void)
{
    // Read sequentially — one sensor at a time to avoid cross-talk
    s_data.entrance_cm = _measure_cm(ULTRASONIC_ENTRANCE_TRIG_GPIO,
                                     ULTRASONIC_ENTRANCE_ECHO_GPIO);
    vTaskDelay(pdMS_TO_TICKS(30)); // 30 ms between sensors avoids echo cross-talk

    s_data.bin_top_cm  = _measure_cm(ULTRASONIC_BIN_TOP_TRIG_GPIO,
                                     ULTRASONIC_BIN_TOP_ECHO_GPIO);
    vTaskDelay(pdMS_TO_TICKS(30));

    s_data.bin_bot_cm  = _measure_cm(ULTRASONIC_BIN_BOT_TRIG_GPIO,
                                     ULTRASONIC_BIN_BOT_ECHO_GPIO);
}

ultrasonic_data_t ultrasonic_get(void)
{
    return s_data;
}

bool ultrasonic_bottle_at_entrance(void)
{
    return s_data.entrance_cm < ULTRASONIC_ENTRANCE_THRESHOLD_CM;
}

bool ultrasonic_bottle_in_bin(void)
{
    return (s_data.bin_top_cm < ULTRASONIC_BIN_THRESHOLD_CM) ||
           (s_data.bin_bot_cm < ULTRASONIC_BIN_THRESHOLD_CM);
}
