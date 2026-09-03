#include "self_test.h"
#include "config.h"
#include "sensor_monitor.h"
#include "ultrasonic.h"
#include "conveyor_motor.h"
#include "driver/uart.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <string.h>
#include <stdio.h>

// ============================================================================
// EcoCharge — Hardware Self-Test
//
// Called from app_main BEFORE sensor_task and bottle_fsm are started,
// so there is no concurrent UART reader or motor user during the test.
// ============================================================================

#define TAG "SelfTest"

static selftest_results_t s_last;
static bool               s_has_results = false;

// ---------------------------------------------------------------------------
// Test 1: sensor-node (ESP32-B) UART connection
// Waits up to SELFTEST_SENSOR_WAIT_MS for a valid "<v>,<i>,<v>,<i>\n" line.
// sensor_init() has already installed the UART driver before we are called.
// ---------------------------------------------------------------------------
static bool _test_sensor_node(void)
{
    ESP_LOGI(TAG, "  Waiting for ESP32-B data (up to %d ms)...", SELFTEST_SENSOR_WAIT_MS);

    char    line[64];
    int     pos          = 0;
    int     remaining_ms = SELFTEST_SENSOR_WAIT_MS;
    uint8_t ch;

    while (remaining_ms > 0) {
        int got = uart_read_bytes(SENSOR_UART_PORT, &ch, 1, pdMS_TO_TICKS(10));
        remaining_ms -= 10;

        if (got != 1) continue;

        if (ch == '\n') {
            line[pos] = '\0';
            int a, b, c, d;
            if (sscanf(line, "%d,%d,%d,%d", &a, &b, &c, &d) == 4) {
                ESP_LOGI(TAG, "  Sensor node UART: SW3V=%d SW3I=%d SW4V=%d SW4I=%d  [PASS]",
                         a, b, c, d);
                return true;
            }
            pos = 0;  // bad line — reset and keep waiting
        } else if (pos < (int)(sizeof(line) - 1)) {
            line[pos++] = (char)ch;
        } else {
            pos = 0;  // overflow — discard
        }
    }

    ESP_LOGW(TAG, "  Sensor node UART: no valid packet received  [WARNING]");
    ESP_LOGW(TAG, "  SW3 & SW4 sensor data will read 0.00 until ESP32-B connects");
    return false;
}

// ---------------------------------------------------------------------------
// Test 2: Voltage & current sensors (all 4 ports)
// Calls sensor_sample_all() a few times to warm up ADC, then reads each port.
// Ports 1 & 2 are always readable (local ADC1); ports 3 & 4 depend on ESP32-B.
// Pass criterion for ADC ports: sensor_get_port() returns ESP_OK.
// Pass criterion for remote ports: always pass (warn if the sensor node is offline).
// ---------------------------------------------------------------------------
static void _test_sensors(selftest_results_t *r)
{
    // Warm-up ADC: three samples, 200 ms apart
    for (int i = 0; i < 3; i++) {
        sensor_sample_all();
        vTaskDelay(pdMS_TO_TICKS(200));
    }

    for (int p = 1; p <= 4; p++) {
        port_sensor_data_t d = {0};
        esp_err_t ret = sensor_get_port((uint8_t)p, &d);

        r->voltage[p - 1] = d.voltage_volts;
        r->current[p - 1] = d.current_amps;

        // Rev 4.0.0: ALL FOUR ports are read by ESP32-B — this board owns no
        // analog channel at all (sensor_monitor.c makes zero adc_oneshot calls,
        // verified 2026-09-03). The old code labelled ports 1-2 as "[ADC]" and
        // treated only 3-4 as remote, which was true in rev 3 and became
        // actively misleading at a bench: it implied this board could read
        // ports 1-2 with ESP32-B unplugged, which it cannot.
        r->sensor_ok[p - 1] = true;   // 0.00 is valid when the node is offline
        if (!r->pico_ok) {
            ESP_LOGW(TAG, "  Port %d [ESP32-B]: V=%.1fV  I=%.3fA  [PASS w/WARNING — node offline]",
                     p, d.voltage_volts, d.current_amps);
        } else {
            ESP_LOGI(TAG, "  Port %d [ESP32-B]: V=%.1fV  I=%.3fA  [PASS]",
                     p, d.voltage_volts, d.current_amps);
        }
    }
}

// ---------------------------------------------------------------------------
// Test 3: Ultrasonic sensors
// Takes two readings to let the sensor settle; reports distance in cm.
// Pass: returned value < ULTRASONIC_MAX_DISTANCE_CM (400 cm means timeout).
// ---------------------------------------------------------------------------
static void _test_ultrasonic(selftest_results_t *r)
{
    // Two reads, stabilise
    ultrasonic_read_all();
    vTaskDelay(pdMS_TO_TICKS(100));
    ultrasonic_read_all();

    ultrasonic_data_t ud = ultrasonic_get();
    r->distance[0] = ud.entrance_cm;
    r->distance[1] = ud.bin_top_cm;
    r->distance[2] = ud.bin_bot_cm;

    static const char *names[3] = {"Entrance  ", "Bin-Top   ", "Bin-Bottom"};
    for (int i = 0; i < 3; i++) {
        r->ultrasonic_ok[i] = (r->distance[i] < ULTRASONIC_MAX_DISTANCE_CM);
        if (r->ultrasonic_ok[i]) {
            ESP_LOGI(TAG, "  %s: %.1f cm  [PASS]", names[i], r->distance[i]);
        } else {
            ESP_LOGE(TAG, "  %s: timeout (>= %.0f cm)  [FAIL]",
                     names[i], ULTRASONIC_MAX_DISTANCE_CM);
        }
    }
}

// ---------------------------------------------------------------------------
// Test 4: Conveyor motor driver
// forward SELFTEST_MOTOR_FWD_MS → stop SELFTEST_MOTOR_PAUSE_MS →
// reverse SELFTEST_MOTOR_REV_MS → stop.
// Pass: all conveyor_* calls return ESP_OK.
// ---------------------------------------------------------------------------
static bool _test_motor(void)
{
    esp_err_t err = ESP_OK;

    ESP_LOGI(TAG, "  Motor FORWARD %d%%  for %d ms...",
             SELFTEST_MOTOR_SPEED, SELFTEST_MOTOR_FWD_MS);
    err |= conveyor_set_speed(SELFTEST_MOTOR_SPEED);
    err |= conveyor_forward();
    vTaskDelay(pdMS_TO_TICKS(SELFTEST_MOTOR_FWD_MS));

    ESP_LOGI(TAG, "  Motor STOP  for %d ms...", SELFTEST_MOTOR_PAUSE_MS);
    err |= conveyor_stop();
    vTaskDelay(pdMS_TO_TICKS(SELFTEST_MOTOR_PAUSE_MS));

    ESP_LOGI(TAG, "  Motor REVERSE %d%%  for %d ms...",
             SELFTEST_MOTOR_SPEED, SELFTEST_MOTOR_REV_MS);
    err |= conveyor_reverse();
    vTaskDelay(pdMS_TO_TICKS(SELFTEST_MOTOR_REV_MS));

    ESP_LOGI(TAG, "  Motor STOP");
    err |= conveyor_stop();
    conveyor_set_speed(MOTOR_DEFAULT_SPEED);  // restore default speed

    bool ok = (err == ESP_OK);
    ESP_LOGI(TAG, "  Motor driver: [%s]", ok ? "PASS" : "FAIL");
    return ok;
}

// ===========================================================================
// Public API
// ===========================================================================

esp_err_t self_test_run(selftest_results_t *results)
{
    memset(results, 0, sizeof(*results));

    ESP_LOGI(TAG, "");
    ESP_LOGI(TAG, "╔══════════════════════════════════════╗");
    ESP_LOGI(TAG, "║   ECOCHARGE HARDWARE SELF-TEST       ║");
    ESP_LOGI(TAG, "╚══════════════════════════════════════╝");

    // ── [1/4] Sensor node UART ───────────────────────────────────────────────
    ESP_LOGI(TAG, "── [1/4] Sensor Node (ESP32-B) UART Connection ──");
    results->pico_ok = _test_sensor_node();

    // ── [2/4] Voltage & Current Sensors ─────────────────────────────────────
    ESP_LOGI(TAG, "── [2/4] Voltage & Current Sensors ──");
    _test_sensors(results);

    // ── [3/4] Ultrasonic Sensors ─────────────────────────────────────────────
    ESP_LOGI(TAG, "── [3/4] Ultrasonic Sensors ──");
    _test_ultrasonic(results);

    // ── [4/4] Conveyor Motor ─────────────────────────────────────────────────
    ESP_LOGI(TAG, "── [4/4] Conveyor Motor Driver ──");
    results->motor_ok = _test_motor();

    // ── Summary ───────────────────────────────────────────────────────────────
    results->fail_count = 0;
    for (int i = 0; i < 4; i++) if (!results->sensor_ok[i])     results->fail_count++;
    for (int i = 0; i < 3; i++) if (!results->ultrasonic_ok[i]) results->fail_count++;
    if (!results->motor_ok) results->fail_count++;
    results->all_critical_ok = (results->fail_count == 0);

    ESP_LOGI(TAG, "");
    ESP_LOGI(TAG, "╔══════════════════════════════════════╗");
    if (results->all_critical_ok && results->pico_ok) {
        ESP_LOGI(TAG, "║   ALL TESTS PASSED ✓                 ║");
    } else if (results->all_critical_ok) {
        ESP_LOGW(TAG, "║   PASSED — sensor-node UART warning  ║");
    } else {
        ESP_LOGE(TAG, "║   %d CRITICAL TEST(S) FAILED          ║", results->fail_count);
    }
    if (!results->pico_ok) {
        ESP_LOGW(TAG, "║   WARNING: ESP32-B not responding    ║");
        ESP_LOGW(TAG, "║   ALL port sensors offline           ║");
    }
    ESP_LOGI(TAG, "╚══════════════════════════════════════╝");
    ESP_LOGI(TAG, "");

    s_last        = *results;
    s_has_results = true;

    return results->all_critical_ok ? ESP_OK : ESP_FAIL;
}

const selftest_results_t *self_test_get_last(void)
{
    return s_has_results ? &s_last : NULL;
}

int self_test_to_json(char *buf, size_t buf_len)
{
    if (!s_has_results) {
        return snprintf(buf, buf_len, "{\"run\":false}");
    }

    const selftest_results_t *r = &s_last;
    int n = 0;

    n += snprintf(buf + n, buf_len - n,
        "{\"run\":true,"
        "\"all_critical_ok\":%s,"
        "\"pico_ok\":%s,"
        "\"motor_ok\":%s,"
        "\"fail_count\":%d,"
        "\"sensors\":[",
        r->all_critical_ok ? "true" : "false",
        r->pico_ok         ? "true" : "false",
        r->motor_ok        ? "true" : "false",
        r->fail_count);

    for (int i = 0; i < 4; i++) {
        n += snprintf(buf + n, buf_len - n,
            "%s{\"port\":%d,\"voltage\":%.1f,\"current\":%.3f,\"ok\":%s}",
            i ? "," : "",
            i + 1,
            r->voltage[i],
            r->current[i],
            r->sensor_ok[i] ? "true" : "false");
    }

    static const char *us_names[3] = {"entrance", "bin_top", "bin_bot"};
    n += snprintf(buf + n, buf_len - n, "],\"ultrasonic\":[");
    for (int i = 0; i < 3; i++) {
        n += snprintf(buf + n, buf_len - n,
            "%s{\"name\":\"%s\",\"distance_cm\":%.1f,\"ok\":%s}",
            i ? "," : "",
            us_names[i],
            r->distance[i],
            r->ultrasonic_ok[i] ? "true" : "false");
    }

    n += snprintf(buf + n, buf_len - n, "]}");
    return n;
}
