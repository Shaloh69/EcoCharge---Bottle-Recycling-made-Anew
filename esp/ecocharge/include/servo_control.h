#ifndef SERVO_CONTROL_H
#define SERVO_CONTROL_H

#include "esp_err.h"

/**
 * @brief Initialize LEDC PWM for the conveyor servo motor.
 * @return ESP_OK on success.
 */
esp_err_t servo_init(void);

/**
 * @brief Move servo to an angle (0–180 degrees).
 * @param angle Target angle in degrees.
 * @return ESP_OK on success.
 */
esp_err_t servo_set_angle(uint8_t angle);

/**
 * @brief Open the conveyor gate (moves to SERVO_OPEN_ANGLE).
 * @return ESP_OK on success.
 */
esp_err_t servo_open(void);

/**
 * @brief Close the conveyor gate (moves to SERVO_CLOSE_ANGLE).
 * @return ESP_OK on success.
 */
esp_err_t servo_close(void);

/**
 * @brief Get the current servo angle.
 * @return Current angle in degrees (0–180).
 */
uint8_t servo_get_angle(void);

/**
 * @brief Check if the conveyor gate is open.
 * @return 1 if open, 0 if closed.
 */
int servo_is_open(void);

#endif // SERVO_CONTROL_H
