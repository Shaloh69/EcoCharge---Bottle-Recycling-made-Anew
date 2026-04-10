#ifndef SELF_TEST_H
#define SELF_TEST_H

// ============================================================================
// EcoCharge Kiosk — Hardware Self-Test Module
//
// Runs once when no WiFi credentials are stored (provisioning mode boot).
// Tests all physical components and reports results via serial log and
// the local web server at GET /api/selftest.
//
// Test sequence:
//   1. Pico UART connection — waits SELFTEST_PICO_WAIT_MS for a valid packet
//   2. Voltage & current sensors — all 4 ports (SW1/SW3 via ADC, SW2/SW4 via Pico)
//   3. Ultrasonic sensors — all 3 (entrance, bin-top, bin-bottom)
//   4. Conveyor motor driver — forward 1 s → stop → reverse 1 s → stop
// ============================================================================

#include <stdbool.h>
#include "esp_err.h"

typedef struct {
    // Voltage & current sensors (ports 1–4)
    float  voltage[4];        // measured voltage (V)
    float  current[4];        // measured current (A)
    bool   sensor_ok[4];      // port 1/3: ADC read ok; port 2/4: Pico data present

    // Ultrasonic distance sensors
    float  distance[3];       // entrance_cm, bin_top_cm, bin_bot_cm
    bool   ultrasonic_ok[3];  // true if returned a valid reading (< max range)

    // Pico UART link (SW2 & SW4 data source)
    bool   pico_ok;           // true if Pico responded within timeout

    // Conveyor motor driver
    bool   motor_ok;          // true if all motor commands returned ESP_OK

    // Summary
    bool   all_critical_ok;   // true if all non-Pico tests passed
    int    fail_count;         // number of failed critical tests (Pico is a warning)
} selftest_results_t;

/**
 * @brief Run the full hardware self-test.
 *        Blocks for approximately 5–6 seconds (motor test included).
 *        Call from app_main BEFORE starting sensor_task or bottle_fsm.
 *
 * @param results  Pointer to struct to fill with results.
 * @return ESP_OK  if all critical tests passed.
 *         ESP_FAIL if one or more critical tests failed (boot continues anyway).
 */
esp_err_t self_test_run(selftest_results_t *results);

/**
 * @brief Get the last test results.
 * @return Pointer to static storage, or NULL if self_test_run has never been called.
 */
const selftest_results_t *self_test_get_last(void);

/**
 * @brief Serialize last test results to a JSON string.
 *        Returns {"run":false} if no test has been run yet.
 *
 * @param buf     Output buffer.
 * @param buf_len Buffer size in bytes.
 * @return Number of bytes written (excluding null terminator).
 */
int self_test_to_json(char *buf, size_t buf_len);

#endif // SELF_TEST_H
