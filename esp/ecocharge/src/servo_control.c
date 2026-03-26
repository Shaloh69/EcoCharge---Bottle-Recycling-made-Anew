#include "servo_control.h"
#include "config.h"
#include "driver/ledc.h"
#include "esp_log.h"

static uint8_t s_current_angle = 0;

// Convert angle (0–180) to LEDC duty for 14-bit timer at 50 Hz
// Period = 1/50Hz = 20 ms = 20 000 µs
// duty = pulse_us / 20000 * (2^14)
static uint32_t _angle_to_duty(uint8_t angle)
{
    uint32_t pulse_us = SERVO_MIN_PULSE_US +
        (uint32_t)angle * (SERVO_MAX_PULSE_US - SERVO_MIN_PULSE_US) / 180;
    return (pulse_us * (1 << 14)) / 20000;
}

esp_err_t servo_init(void)
{
    ledc_timer_config_t timer = {
        .speed_mode      = SERVO_LEDC_MODE,
        .timer_num       = SERVO_LEDC_TIMER,
        .duty_resolution = SERVO_LEDC_BITS,
        .freq_hz         = SERVO_PWM_FREQ_HZ,
        .clk_cfg         = LEDC_AUTO_CLK,
    };
    esp_err_t ret = ledc_timer_config(&timer);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "Servo LEDC timer config failed: %s", esp_err_to_name(ret));
        return ret;
    }

    ledc_channel_config_t channel = {
        .gpio_num   = SERVO_GPIO,
        .speed_mode = SERVO_LEDC_MODE,
        .channel    = SERVO_LEDC_CHANNEL,
        .timer_sel  = SERVO_LEDC_TIMER,
        .duty       = _angle_to_duty(SERVO_CLOSE_ANGLE),
        .hpoint     = 0,
    };
    ret = ledc_channel_config(&channel);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "Servo LEDC channel config failed: %s", esp_err_to_name(ret));
        return ret;
    }

    s_current_angle = SERVO_CLOSE_ANGLE;
    ESP_LOGI(LOG_TAG, "Servo initialized on GPIO %d, angle=%d", SERVO_GPIO, s_current_angle);
    return ESP_OK;
}

esp_err_t servo_set_angle(uint8_t angle)
{
    if (angle > 180) angle = 180;

    uint32_t duty = _angle_to_duty(angle);
    esp_err_t ret = ledc_set_duty(SERVO_LEDC_MODE, SERVO_LEDC_CHANNEL, duty);
    if (ret != ESP_OK) return ret;

    ret = ledc_update_duty(SERVO_LEDC_MODE, SERVO_LEDC_CHANNEL);
    if (ret == ESP_OK) {
        s_current_angle = angle;
        ESP_LOGI(LOG_TAG, "Servo angle -> %d°", angle);
    }
    return ret;
}

esp_err_t servo_open(void)
{
    return servo_set_angle(SERVO_OPEN_ANGLE);
}

esp_err_t servo_close(void)
{
    return servo_set_angle(SERVO_CLOSE_ANGLE);
}

uint8_t servo_get_angle(void)
{
    return s_current_angle;
}

int servo_is_open(void)
{
    return s_current_angle == SERVO_OPEN_ANGLE;
}
