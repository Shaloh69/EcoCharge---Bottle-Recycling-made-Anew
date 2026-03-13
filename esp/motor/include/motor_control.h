#ifndef MOTOR_CONTROL_H
#define MOTOR_CONTROL_H

#include "esp_err.h"
#include <stdint.h>
#include <stdbool.h>

// ============================================================================
// EcoCharge Motor Control System - API Header
// ============================================================================

// ----------------------------------------------------------------------------
// Motor State Enumeration
// ----------------------------------------------------------------------------
typedef enum {
    MOTOR_STOPPED = 0,      // Motor is stopped (idle)
    MOTOR_FORWARD,          // Motor running forward
    MOTOR_BACKWARD          // Motor running backward
} motor_state_t;

// ----------------------------------------------------------------------------
// Motor Status Structure
// ----------------------------------------------------------------------------
typedef struct {
    motor_state_t state;        // Current motor state
    uint8_t speed;              // Current speed (0-100%)
    uint32_t runtime_ms;        // Runtime since last start (milliseconds)
    bool timeout_occurred;      // True if timeout has occurred
    bool is_running;            // True if motor is currently running
} motor_status_t;

// ----------------------------------------------------------------------------
// Motor Control API Functions
// ----------------------------------------------------------------------------

/**
 * @brief Initialize motor control system
 *
 * Configures GPIO pins, initializes MCPWM peripheral, and sets motor to
 * stopped state. Must be called before any other motor functions.
 *
 * @return ESP_OK on success, ESP_ERR_* on failure
 */
esp_err_t motor_init(void);

/**
 * @brief Move motor forward at specified speed
 *
 * @param speed Speed percentage (0-100). Values < 20 may not start motor.
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG if speed > 100
 */
esp_err_t motor_forward(uint8_t speed);

/**
 * @brief Move motor backward at specified speed
 *
 * @param speed Speed percentage (0-100). Values < 20 may not start motor.
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG if speed > 100
 */
esp_err_t motor_backward(uint8_t speed);

/**
 * @brief Stop motor immediately
 *
 * Sets both direction pins LOW and PWM duty to 0%. Also resets runtime counter.
 *
 * @return ESP_OK on success
 */
esp_err_t motor_stop(void);

/**
 * @brief Change motor speed while running
 *
 * Can be called while motor is running to adjust speed without stopping.
 * If motor is stopped, this sets the speed for next movement command.
 *
 * @param speed New speed percentage (0-100)
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG if speed > 100
 */
esp_err_t motor_set_speed(uint8_t speed);

/**
 * @brief Get current motor status
 *
 * @param status Pointer to motor_status_t structure to fill
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG if status is NULL
 */
esp_err_t motor_get_status(motor_status_t *status);

/**
 * @brief Emergency stop - immediately stops motor and sets error flag
 *
 * Used by safety monitor when timeout occurs. Can also be called manually
 * for emergency situations. Requires motor_init() to be called to clear.
 *
 * @return ESP_OK on success
 */
esp_err_t motor_emergency_stop(void);

/**
 * @brief Reset timeout flag after emergency stop
 *
 * Clears the timeout_occurred flag and allows motor operation to resume.
 *
 * @return ESP_OK on success
 */
esp_err_t motor_reset_timeout(void);

/**
 * @brief Check if motor is currently running
 *
 * @return true if motor is running (forward or backward), false if stopped
 */
bool motor_is_running(void);

/**
 * @brief Get motor runtime in milliseconds
 *
 * @return Runtime since last start in milliseconds, 0 if stopped
 */
uint32_t motor_get_runtime_ms(void);

#endif // MOTOR_CONTROL_H
