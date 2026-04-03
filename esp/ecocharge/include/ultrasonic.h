#ifndef ULTRASONIC_H
#define ULTRASONIC_H

// ============================================================================
// EcoCharge — HC-SR04 Ultrasonic Distance Sensor Driver
//
// Three sensors:
//   ENTRANCE  — detects bottle placed at the belt entry
//   BIN_TOP   — detects bottle in upper region of collection bin
//   BIN_BOTTOM— detects bottle in lower region of collection bin
//
// Measurement is done by polling (10 µs TRIG pulse, measure ECHO width).
// Call ultrasonic_read_all() from the sensor task every SENSOR_SAMPLE_MS.
// ============================================================================

#include "esp_err.h"
#include <stdbool.h>

typedef struct {
    float entrance_cm;    // distance at entrance sensor (cm)
    float bin_top_cm;     // distance at bin top sensor (cm)
    float bin_bot_cm;     // distance at bin bottom sensor (cm)
} ultrasonic_data_t;

/**
 * @brief Configure TRIG/ECHO GPIO pins for all three sensors.
 * @return ESP_OK on success.
 */
esp_err_t ultrasonic_init(void);

/**
 * @brief Read all three sensors and update internal state.
 *        Call from sensor_task on every sample tick.
 */
void ultrasonic_read_all(void);

/**
 * @brief Get the latest readings (filled by ultrasonic_read_all).
 */
ultrasonic_data_t ultrasonic_get(void);

/**
 * @brief Return true if a bottle is present at the entrance.
 */
bool ultrasonic_bottle_at_entrance(void);

/**
 * @brief Return true if a bottle is detected in the bin
 *        (either top OR bottom sensor triggered).
 */
bool ultrasonic_bottle_in_bin(void);

#endif // ULTRASONIC_H
