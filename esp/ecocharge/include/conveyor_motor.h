#ifndef CONVEYOR_MOTOR_H
#define CONVEYOR_MOTOR_H

// ============================================================================
// EcoCharge Conveyor Motor — L298N H-Bridge Driver
//
// Pin assignments (set in config.h):
//   MOTOR_IN1_GPIO — direction pin 1 (HIGH = forward)
//   MOTOR_IN2_GPIO — direction pin 2 (HIGH = reverse)
//   MOTOR_ENA_GPIO — LEDC PWM enable (speed control 0–100 %)
//
// Truth table:
//   Forward : IN1=H  IN2=L  ENA=PWM
//   Reverse : IN1=L  IN2=H  ENA=PWM
//   Stop    : IN1=L  IN2=L  ENA=0
// ============================================================================

#include "esp_err.h"
#include <stdint.h>

typedef enum {
    CONVEYOR_STOPPED = 0,
    CONVEYOR_FORWARD,
    CONVEYOR_REVERSE,
} conveyor_dir_t;

/**
 * @brief Initialise GPIO outputs and LEDC PWM channel for the L298N.
 *        Motor starts stopped.
 */
esp_err_t conveyor_init(void);

/**
 * @brief Run belt forward at the current speed setting.
 */
esp_err_t conveyor_forward(void);

/**
 * @brief Run belt in reverse at the current speed setting.
 */
esp_err_t conveyor_reverse(void);

/**
 * @brief Stop the belt (ENA = 0, direction pins cleared).
 */
esp_err_t conveyor_stop(void);

/**
 * @brief Set motor speed.  Takes effect immediately if running.
 * @param percent  0 = off, 100 = full speed.
 */
esp_err_t conveyor_set_speed(uint8_t percent);

/** @brief Return current speed (0–100). */
uint8_t conveyor_get_speed(void);

/** @brief Return current direction state. */
conveyor_dir_t conveyor_get_direction(void);

/** @brief Return 1 if the belt is running (forward or reverse), 0 if stopped. */
int conveyor_is_running(void);

#endif // CONVEYOR_MOTOR_H
