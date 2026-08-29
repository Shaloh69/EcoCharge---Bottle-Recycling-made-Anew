#ifndef SENSOR_MONITOR_H
#define SENSOR_MONITOR_H

#include "esp_err.h"
#include <stdint.h>
#include <stdbool.h>

typedef struct {
    uint8_t  port;
    float    current_amps;
    float    voltage_volts;
    int      relay_on;
    int      overcurrent;
} port_sensor_data_t;

/**
 * @brief Initialize ADC for current and voltage sensors.
 * @return ESP_OK on success.
 */
esp_err_t sensor_init(void);

/**
 * @brief Read sensors for all 4 charging ports.
 *        Called periodically from the sensor task.
 */
void sensor_sample_all(void);

/**
 * @brief Get the latest sensor reading for a port.
 * @param port Port number (1–4).
 * @param out  Output struct to fill.
 * @return ESP_OK, or ESP_ERR_INVALID_ARG if port out of range.
 */
esp_err_t sensor_get_port(uint8_t port, port_sensor_data_t *out);

/**
 * @brief Check if any port is in overcurrent state.
 * @return Bitmask: bit N-1 set if port N is overcurrent.
 */
uint8_t sensor_get_overcurrent_mask(void);

/**
 * @brief What ESP32-B reports a relay is PHYSICALLY doing.
 *
 * Added rev 4.0.0. Differs from what this board last commanded exactly when it
 * matters: B tripped the port on overcurrent, or B cut everything after losing
 * our heartbeat. Used by relay_port_is_active() so telemetry reports reality.
 *
 * @return 1 on, 0 off, or -1 if B has not reported yet / the link is down.
 */
int sensor_reported_relay_state(uint8_t port);

/** @brief True while ESP32-B telemetry is arriving. Added rev 4.0.0. */
bool sensor_link_is_up(void);

#endif // SENSOR_MONITOR_H
