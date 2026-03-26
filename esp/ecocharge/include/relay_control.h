#ifndef RELAY_CONTROL_H
#define RELAY_CONTROL_H

#include "esp_err.h"
#include <stdint.h>

/**
 * @brief Initialize relay GPIO outputs (all ports start OFF).
 * @return ESP_OK on success.
 */
esp_err_t relay_init(void);

/**
 * @brief Enable a charging port relay.
 * @param port Port number (1–4).
 * @param duration_seconds How long to keep relay on. 0 = indefinite.
 * @return ESP_OK on success, ESP_ERR_INVALID_ARG if port is out of range.
 */
esp_err_t relay_enable_port(uint8_t port, uint32_t duration_seconds);

/**
 * @brief Disable a charging port relay immediately.
 * @param port Port number (1–4).
 * @return ESP_OK on success.
 */
esp_err_t relay_disable_port(uint8_t port);

/**
 * @brief Emergency: disable all charging port relays.
 */
void relay_disable_all(void);

/**
 * @brief Check if a port relay is currently active.
 * @param port Port number (1–4).
 * @return 1 if active, 0 if off.
 */
int relay_port_is_active(uint8_t port);

/**
 * @brief Get elapsed time for an active port in milliseconds.
 * @param port Port number (1–4).
 * @return Milliseconds since relay was enabled, or 0 if inactive.
 */
uint32_t relay_port_elapsed_ms(uint8_t port);

/**
 * @brief Called periodically (from safety task) to enforce duration timeouts.
 *        Disables relays that have exceeded their allowed duration.
 */
void relay_check_timeouts(void);

#endif // RELAY_CONTROL_H
