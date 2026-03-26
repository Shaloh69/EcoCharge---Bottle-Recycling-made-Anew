#include "conveyor_motor.h"
#include "config.h"
#include "driver/gpio.h"
#include "driver/ledc.h"
#include "esp_log.h"

// ============================================================================
// EcoCharge Conveyor Motor — L298N H-Bridge Driver
// ============================================================================

static conveyor_dir_t s_direction = CONVEYOR_STOPPED;
static uint8_t        s_speed_pct = MOTOR_DEFAULT_SPEED;

// ---------------------------------------------------------------------------
// Internal: apply current direction and speed to hardware pins
// ---------------------------------------------------------------------------
static void _apply(conveyor_dir_t dir, uint8_t pct)
{
    // ENA duty cycle: pct% of (2^bits - 1)
    uint32_t max_duty = (1u << MOTOR_LEDC_BITS) - 1;
    uint32_t duty     = (dir == CONVEYOR_STOPPED) ? 0
                        : (uint32_t)((pct * max_duty + 50) / 100);

    // Direction pins
    int in1 = (dir == CONVEYOR_FORWARD)  ? 1 : 0;
    int in2 = (dir == CONVEYOR_REVERSE)  ? 1 : 0;

    gpio_set_level(MOTOR_IN1_GPIO, in1);
    gpio_set_level(MOTOR_IN2_GPIO, in2);
    ledc_set_duty(MOTOR_LEDC_MODE, MOTOR_LEDC_CHANNEL, duty);
    ledc_update_duty(MOTOR_LEDC_MODE, MOTOR_LEDC_CHANNEL);

    s_direction = dir;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
esp_err_t conveyor_init(void)
{
    // --- Direction pins (digital output) ---
    gpio_config_t io = {
        .pin_bit_mask = (1ULL << MOTOR_IN1_GPIO) | (1ULL << MOTOR_IN2_GPIO),
        .mode         = GPIO_MODE_OUTPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    esp_err_t ret = gpio_config(&io);
    if (ret != ESP_OK) return ret;

    gpio_set_level(MOTOR_IN1_GPIO, 0);
    gpio_set_level(MOTOR_IN2_GPIO, 0);

    // --- ENA pin — LEDC PWM (speed control) ---
    ledc_timer_config_t timer = {
        .speed_mode      = MOTOR_LEDC_MODE,
        .timer_num       = MOTOR_LEDC_TIMER,
        .duty_resolution = MOTOR_LEDC_BITS,
        .freq_hz         = MOTOR_PWM_FREQ_HZ,
        .clk_cfg         = LEDC_AUTO_CLK,
    };
    ret = ledc_timer_config(&timer);
    if (ret != ESP_OK) return ret;

    ledc_channel_config_t ch = {
        .gpio_num   = MOTOR_ENA_GPIO,
        .speed_mode = MOTOR_LEDC_MODE,
        .channel    = MOTOR_LEDC_CHANNEL,
        .timer_sel  = MOTOR_LEDC_TIMER,
        .duty       = 0,
        .hpoint     = 0,
    };
    ret = ledc_channel_config(&ch);
    if (ret != ESP_OK) return ret;

    ESP_LOGI(LOG_TAG, "Conveyor motor init — IN1:GPIO%d IN2:GPIO%d ENA:GPIO%d",
             MOTOR_IN1_GPIO, MOTOR_IN2_GPIO, MOTOR_ENA_GPIO);
    return ESP_OK;
}

esp_err_t conveyor_forward(void)
{
    _apply(CONVEYOR_FORWARD, s_speed_pct);
    ESP_LOGI(LOG_TAG, "Conveyor FORWARD %d%%", s_speed_pct);
    return ESP_OK;
}

esp_err_t conveyor_reverse(void)
{
    _apply(CONVEYOR_REVERSE, s_speed_pct);
    ESP_LOGI(LOG_TAG, "Conveyor REVERSE %d%%", s_speed_pct);
    return ESP_OK;
}

esp_err_t conveyor_stop(void)
{
    _apply(CONVEYOR_STOPPED, 0);
    ESP_LOGI(LOG_TAG, "Conveyor STOP");
    return ESP_OK;
}

esp_err_t conveyor_set_speed(uint8_t percent)
{
    if (percent > 100) percent = 100;
    s_speed_pct = percent;
    // If already running, update duty immediately
    if (s_direction != CONVEYOR_STOPPED) {
        _apply(s_direction, s_speed_pct);
    }
    ESP_LOGI(LOG_TAG, "Conveyor speed set to %d%%", s_speed_pct);
    return ESP_OK;
}

uint8_t conveyor_get_speed(void)
{
    return s_speed_pct;
}

conveyor_dir_t conveyor_get_direction(void)
{
    return s_direction;
}

int conveyor_is_running(void)
{
    return s_direction != CONVEYOR_STOPPED;
}
