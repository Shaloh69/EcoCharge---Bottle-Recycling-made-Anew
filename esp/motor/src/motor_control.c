#include "motor_control.h"
#include "config.h"
#include "driver/mcpwm.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

// ============================================================================
// EcoCharge Motor Control System - Implementation
// ============================================================================

// Private state variables
static motor_state_t current_state = MOTOR_STOPPED;
static uint8_t current_speed = MOTOR_DEFAULT_SPEED;
static uint32_t motor_start_time = 0;
static bool timeout_flag = false;
static bool initialized = false;

// ----------------------------------------------------------------------------
// Private Helper Functions
// ----------------------------------------------------------------------------

/**
 * @brief Convert percentage (0-100) to PWM duty cycle
 *
 * @param speed_percent Speed as percentage (0-100)
 * @return Duty cycle value (0.0 - 100.0)
 */
static float speed_to_duty(uint8_t speed_percent) {
    if (speed_percent == 0) {
        return 0.0f;
    }

    // Apply minimum duty cycle for reliable motor starting
    if (speed_percent < MOTOR_MIN_DUTY) {
        speed_percent = MOTOR_MIN_DUTY;
    }

    // Clamp to maximum
    if (speed_percent > MOTOR_MAX_DUTY) {
        speed_percent = MOTOR_MAX_DUTY;
    }

    return (float)speed_percent;
}

/**
 * @brief Set direction pins for forward movement
 */
static void set_direction_forward(void) {
    gpio_set_level(MOTOR_PIN_IN1, 1);  // IN1 = HIGH
    gpio_set_level(MOTOR_PIN_IN2, 0);  // IN2 = LOW
}

/**
 * @brief Set direction pins for backward movement
 */
static void set_direction_backward(void) {
    gpio_set_level(MOTOR_PIN_IN1, 0);  // IN1 = LOW
    gpio_set_level(MOTOR_PIN_IN2, 1);  // IN2 = HIGH
}

/**
 * @brief Set direction pins for stop (brake)
 */
static void set_direction_stop(void) {
    gpio_set_level(MOTOR_PIN_IN1, 0);  // IN1 = LOW
    gpio_set_level(MOTOR_PIN_IN2, 0);  // IN2 = LOW
}

/**
 * @brief Update PWM duty cycle
 *
 * @param duty_percent Duty cycle as percentage (0.0 - 100.0)
 */
static esp_err_t update_pwm_duty(float duty_percent) {
    esp_err_t ret = mcpwm_set_duty(MCPWM_UNIT, MCPWM_TIMER, MCPWM_OPERATOR, duty_percent);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "Failed to set PWM duty: %s", esp_err_to_name(ret));
        return ret;
    }

    // Ensure duty cycle is applied
    ret = mcpwm_set_duty_type(MCPWM_UNIT, MCPWM_TIMER, MCPWM_OPERATOR, MCPWM_DUTY_MODE_0);
    return ret;
}

// ----------------------------------------------------------------------------
// Public API Implementation
// ----------------------------------------------------------------------------

esp_err_t motor_init(void) {
    ESP_LOGI(LOG_TAG, "Initializing motor control system...");

    // Configure GPIO pins as outputs
    gpio_config_t io_conf = {
        .mode = GPIO_MODE_OUTPUT,
        .pin_bit_mask = (1ULL << MOTOR_PIN_IN1) |
                        (1ULL << MOTOR_PIN_IN2) |
                        (1ULL << STATUS_LED_PIN),
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };

    esp_err_t ret = gpio_config(&io_conf);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "Failed to configure GPIO: %s", esp_err_to_name(ret));
        return ret;
    }

    // Set initial state to stopped
    set_direction_stop();
    gpio_set_level(STATUS_LED_PIN, 0);

    // Configure MCPWM for motor speed control
    ESP_LOGI(LOG_TAG, "Configuring MCPWM for GPIO %d", MOTOR_PIN_ENA);

    // Initialize MCPWM GPIO
    ret = mcpwm_gpio_init(MCPWM_UNIT, MCPWM_IO_SIGNAL, MOTOR_PIN_ENA);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "Failed to initialize MCPWM GPIO: %s", esp_err_to_name(ret));
        return ret;
    }

    // Configure MCPWM parameters
    mcpwm_config_t pwm_config = {
        .frequency = MOTOR_PWM_FREQ_HZ,     // 1kHz PWM frequency
        .cmpr_a = 0,                         // Initial duty cycle: 0%
        .cmpr_b = 0,
        .duty_mode = MCPWM_DUTY_MODE_0,     // Active high
        .counter_mode = MCPWM_UP_COUNTER    // Count up
    };

    ret = mcpwm_init(MCPWM_UNIT, MCPWM_TIMER, &pwm_config);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "Failed to initialize MCPWM: %s", esp_err_to_name(ret));
        return ret;
    }

    // Set initial PWM duty to 0%
    ret = update_pwm_duty(0.0f);
    if (ret != ESP_OK) {
        return ret;
    }

    // Initialize state variables
    current_state = MOTOR_STOPPED;
    current_speed = MOTOR_DEFAULT_SPEED;
    motor_start_time = 0;
    timeout_flag = false;
    initialized = true;

    ESP_LOGI(LOG_TAG, "Motor control initialized successfully");
    return ESP_OK;
}

esp_err_t motor_forward(uint8_t speed) {
    if (!initialized) {
        ESP_LOGE(LOG_TAG, "Motor not initialized");
        return ESP_ERR_INVALID_STATE;
    }

    if (speed > 100) {
        ESP_LOGE(LOG_TAG, "Invalid speed: %d (must be 0-100)", speed);
        return ESP_ERR_INVALID_ARG;
    }

    if (timeout_flag) {
        ESP_LOGW(LOG_TAG, "Timeout flag set, resetting before operation");
        motor_reset_timeout();
    }

    ESP_LOGI(LOG_TAG, "Moving forward at %d%% speed", speed);

    // Set direction to forward
    set_direction_forward();

    // Update speed
    current_speed = speed;
    float duty = speed_to_duty(speed);
    esp_err_t ret = update_pwm_duty(duty);
    if (ret != ESP_OK) {
        return ret;
    }

    // Update state
    current_state = MOTOR_FORWARD;
    motor_start_time = xTaskGetTickCount() * portTICK_PERIOD_MS;

    // Turn on status LED
    gpio_set_level(STATUS_LED_PIN, 1);

    return ESP_OK;
}

esp_err_t motor_backward(uint8_t speed) {
    if (!initialized) {
        ESP_LOGE(LOG_TAG, "Motor not initialized");
        return ESP_ERR_INVALID_STATE;
    }

    if (speed > 100) {
        ESP_LOGE(LOG_TAG, "Invalid speed: %d (must be 0-100)", speed);
        return ESP_ERR_INVALID_ARG;
    }

    if (timeout_flag) {
        ESP_LOGW(LOG_TAG, "Timeout flag set, resetting before operation");
        motor_reset_timeout();
    }

    ESP_LOGI(LOG_TAG, "Moving backward at %d%% speed", speed);

    // Set direction to backward
    set_direction_backward();

    // Update speed
    current_speed = speed;
    float duty = speed_to_duty(speed);
    esp_err_t ret = update_pwm_duty(duty);
    if (ret != ESP_OK) {
        return ret;
    }

    // Update state
    current_state = MOTOR_BACKWARD;
    motor_start_time = xTaskGetTickCount() * portTICK_PERIOD_MS;

    // Turn on status LED
    gpio_set_level(STATUS_LED_PIN, 1);

    return ESP_OK;
}

esp_err_t motor_stop(void) {
    if (!initialized) {
        ESP_LOGE(LOG_TAG, "Motor not initialized");
        return ESP_ERR_INVALID_STATE;
    }

    ESP_LOGI(LOG_TAG, "Stopping motor");

    // Set direction pins to brake
    set_direction_stop();

    // Set PWM duty to 0%
    esp_err_t ret = update_pwm_duty(0.0f);
    if (ret != ESP_OK) {
        return ret;
    }

    // Update state
    current_state = MOTOR_STOPPED;
    motor_start_time = 0;

    // Turn off status LED
    gpio_set_level(STATUS_LED_PIN, 0);

    return ESP_OK;
}

esp_err_t motor_set_speed(uint8_t speed) {
    if (!initialized) {
        ESP_LOGE(LOG_TAG, "Motor not initialized");
        return ESP_ERR_INVALID_STATE;
    }

    if (speed > 100) {
        ESP_LOGE(LOG_TAG, "Invalid speed: %d (must be 0-100)", speed);
        return ESP_ERR_INVALID_ARG;
    }

    ESP_LOGI(LOG_TAG, "Setting speed to %d%%", speed);

    current_speed = speed;

    // If motor is running, update PWM immediately
    if (current_state != MOTOR_STOPPED) {
        float duty = speed_to_duty(speed);
        return update_pwm_duty(duty);
    }

    return ESP_OK;
}

esp_err_t motor_get_status(motor_status_t *status) {
    if (!initialized) {
        return ESP_ERR_INVALID_STATE;
    }

    if (status == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    status->state = current_state;
    status->speed = current_speed;
    status->timeout_occurred = timeout_flag;
    status->is_running = (current_state != MOTOR_STOPPED);

    if (motor_start_time > 0) {
        uint32_t current_time = xTaskGetTickCount() * portTICK_PERIOD_MS;
        status->runtime_ms = current_time - motor_start_time;
    } else {
        status->runtime_ms = 0;
    }

    return ESP_OK;
}

esp_err_t motor_emergency_stop(void) {
    if (!initialized) {
        return ESP_ERR_INVALID_STATE;
    }

    ESP_LOGW(LOG_TAG, "EMERGENCY STOP triggered!");

    // Immediately stop motor
    set_direction_stop();
    update_pwm_duty(0.0f);

    // Update state
    current_state = MOTOR_STOPPED;
    motor_start_time = 0;
    timeout_flag = true;

    // Blink LED to indicate error
    gpio_set_level(STATUS_LED_PIN, 0);

    return ESP_OK;
}

esp_err_t motor_reset_timeout(void) {
    if (!initialized) {
        return ESP_ERR_INVALID_STATE;
    }

    ESP_LOGI(LOG_TAG, "Resetting timeout flag");
    timeout_flag = false;
    return ESP_OK;
}

bool motor_is_running(void) {
    return (initialized && current_state != MOTOR_STOPPED);
}

uint32_t motor_get_runtime_ms(void) {
    if (!initialized || motor_start_time == 0) {
        return 0;
    }

    uint32_t current_time = xTaskGetTickCount() * portTICK_PERIOD_MS;
    return current_time - motor_start_time;
}
