#ifndef SENSOR_MONITOR_H
#define SENSOR_MONITOR_H

#include "esp_err.h"
#include <stdint.h>

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

#endif // SENSOR_MONITOR_H
