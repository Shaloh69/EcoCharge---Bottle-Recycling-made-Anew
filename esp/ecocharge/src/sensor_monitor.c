#include "sensor_monitor.h"
#include "config.h"
#include "driver/uart.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include <stdio.h>
#include <string.h>

// ============================================================================
// Sensor monitor — hardware revision 4.0.0 (2026-08-25)
//
// This board reads NO analog channels any more. All eight (4 ports x voltage +
// current) live on ESP32-B, together with the relays, and arrive here as one
// telemetry line every SENSOR_UART_PERIOD_MS:
//
//     "T,<v1>,<i1>,<v2>,<i2>,<v3>,<i3>,<v4>,<i4>,<relaymask>,<ocmask>\n"
//
// Why the split went this way (rev 4): ADC1 offers only four usable channels on
// the boards in use, because GPIO36-39 do not exist on them. ADC2 has plenty
// more but is unusable while WiFi is active. ESP32-B never starts its radio, so
// B is the only board that can use ADC2 — which is what makes all eight
// channels possible on one microcontroller.
//
// Overcurrent tripping is NOT done here. B trips its own relays locally, so the
// protection cannot be delayed or lost by a serial hiccup. This board only
// reports what B says happened.
// ============================================================================

static port_sensor_data_t s_data[NUM_CHARGING_PORTS] = {0};

// -1 until B has reported at least once; see sensor_reported_relay_state().
static int  s_relay_reported[NUM_CHARGING_PORTS] = {-1, -1, -1, -1};
static bool s_link_up      = false;
static TickType_t s_last_rx = 0;

static float _adc_to_current(int raw)
{
    const float v = (float)raw * ((float)ADC_VREF_MV / (float)ADC_MAX_VALUE) / 1000.0f;
    return (v - CURRENT_SENSOR_VOFFSET) / CURRENT_SENSOR_SENSITIVITY;
}

static float _adc_to_voltage(int raw)
{
    const float v = (float)raw * ((float)ADC_VREF_MV / (float)ADC_MAX_VALUE) / 1000.0f;
    return v * VOLTAGE_SCALE;
}

esp_err_t sensor_init(void)
{
    // UART2 is the only hardware this module owns now. It is shared with
    // relay_control.c, which writes commands on the same link — installed here
    // because sensor_init() runs first in main.c's peripheral bring-up.
    uart_config_t uart_cfg = {
        .baud_rate  = SENSOR_UART_BAUD,
        .data_bits  = UART_DATA_8_BITS,
        .parity     = UART_PARITY_DISABLE,
        .stop_bits  = UART_STOP_BITS_1,
        .flow_ctrl  = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };

    esp_err_t ret = uart_driver_install(SENSOR_UART_PORT, SENSOR_UART_BUF * 2,
                                        SENSOR_UART_BUF, 0, NULL, 0);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "Sensor UART install failed: %s", esp_err_to_name(ret));
        return ret;
    }
    uart_param_config(SENSOR_UART_PORT, &uart_cfg);
    uart_set_pin(SENSOR_UART_PORT,
                 SENSOR_UART_TX_GPIO, SENSOR_UART_RX_GPIO,
                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);

    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        s_data[i].port = (uint8_t)(i + 1);
    }

    ESP_LOGI(LOG_TAG, "Sensor monitor initialized — all 8 channels + relays on "
                      "ESP32-B, UART2 RX:%d TX:%d",
             SENSOR_UART_RX_GPIO, SENSOR_UART_TX_GPIO);
    return ESP_OK;
}

/**
 * Consume every complete line currently buffered, keeping the newest valid
 * telemetry frame. Draining rather than reading one line prevents a backlog
 * building up if this task is ever starved — stale readings are worse than
 * dropped ones for a live power display.
 */
static bool _read_telemetry(int *v, int *i, int *relaymask, int *ocmask)
{
    static char buf[160];
    static int  pos = 0;

    uint8_t ch;
    bool got = false;

    while (uart_read_bytes(SENSOR_UART_PORT, &ch, 1, 0) == 1) {
        if (ch == '\n') {
            buf[pos] = '\0';
            pos = 0;

            int a[8], rm, om;
            if (buf[0] == 'T' &&
                sscanf(buf, "T,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d",
                       &a[0], &a[1], &a[2], &a[3], &a[4], &a[5], &a[6], &a[7],
                       &rm, &om) == 10) {
                for (int k = 0; k < 4; k++) {
                    v[k] = a[k * 2];
                    i[k] = a[k * 2 + 1];
                }
                *relaymask = rm;
                *ocmask    = om;
                got = true;
            }
        } else if (pos < (int)(sizeof(buf) - 1)) {
            buf[pos++] = (char)ch;
        } else {
            pos = 0;  // overflow — discard the line rather than mis-parse it
        }
    }
    return got;
}

void sensor_sample_all(void)
{
    int v[4], i[4], relaymask = 0, ocmask = 0;

    if (_read_telemetry(v, i, &relaymask, &ocmask)) {
        for (int k = 0; k < NUM_CHARGING_PORTS; k++) {
            s_data[k].voltage_volts = _adc_to_voltage(v[k]);
            s_data[k].current_amps  = _adc_to_current(i[k]);
            s_data[k].relay_on      = (relaymask >> k) & 1;
            s_data[k].overcurrent   = (ocmask    >> k) & 1;
            s_relay_reported[k]     = s_data[k].relay_on;
        }
        s_last_rx = xTaskGetTickCount();
        if (!s_link_up) {
            s_link_up = true;
            ESP_LOGI(LOG_TAG, "ESP32-B link UP — telemetry flowing");
        }
        return;
    }

    // No frame this cycle. One missed 100 ms frame is normal; a sustained
    // silence means B is gone, and the readings on screen would otherwise
    // freeze at their last values and look plausible forever.
    if (s_link_up &&
        (xTaskGetTickCount() - s_last_rx) * portTICK_PERIOD_MS > SENSOR_LINK_TIMEOUT_MS) {
        s_link_up = false;
        ESP_LOGE(LOG_TAG, "ESP32-B link DOWN — no telemetry for %d ms. "
                          "B cuts its own relays on this timeout.",
                 SENSOR_LINK_TIMEOUT_MS);
        for (int k = 0; k < NUM_CHARGING_PORTS; k++) {
            s_data[k].current_amps  = 0.0f;
            s_data[k].voltage_volts = 0.0f;
            s_relay_reported[k]     = -1;
        }
    }
}

esp_err_t sensor_get_port(uint8_t port, port_sensor_data_t *out)
{
    if (port < 1 || port > NUM_CHARGING_PORTS || !out) {
        return ESP_ERR_INVALID_ARG;
    }
    *out = s_data[port - 1];
    return ESP_OK;
}

uint8_t sensor_get_overcurrent_mask(void)
{
    uint8_t mask = 0;
    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        if (s_data[i].overcurrent) mask |= (uint8_t)(1u << i);
    }
    return mask;
}

int sensor_reported_relay_state(uint8_t port)
{
    if (port < 1 || port > NUM_CHARGING_PORTS) return -1;
    return s_relay_reported[port - 1];
}

bool sensor_link_is_up(void)
{
    return s_link_up;
}
