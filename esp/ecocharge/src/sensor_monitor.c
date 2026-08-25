#include "sensor_monitor.h"
#include "relay_control.h"
#include "config.h"
#include "esp_adc/adc_oneshot.h"
#include "driver/uart.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <string.h>
#include <stdio.h>

// ADC1 channels — SW1 and SW2 are read locally; SW3/SW4 arrive from ESP32-B
// over UART (hardware rev 3.0.0, 2026-08-20 — the Pico is gone).
static const adc_channel_t CURRENT_CH[2] = {
    CURRENT_PORT1_ADC_CHANNEL,  // SW1 — GPIO 33
    CURRENT_PORT2_ADC_CHANNEL,  // SW2 — GPIO 35
};
static const adc_channel_t VOLTAGE_CH[2] = {
    VOLTAGE_PORT1_ADC_CHANNEL,  // SW1 — GPIO 32
    VOLTAGE_PORT2_ADC_CHANNEL,  // SW2 — GPIO 34
};

// Index in s_data[] that each locally-read ADC pair maps to (0-based ports).
static const int LOCAL_PORT_IDX[2] = { 0, 1 };   // SW1, SW2

static adc_oneshot_unit_handle_t s_adc1;
// ADC2 is no longer used anywhere in this firmware. It is unusable while WiFi
// is active (shared with the RF switch), which is exactly why SW4's current
// used to read as a permanent 0. Rev 3.0.0 moves ports 3 and 4 onto ESP32-B's
// own ADC1, so all eight channels are now genuinely measured.
static port_sensor_data_t s_data[NUM_CHARGING_PORTS] = {0};
static uint32_t s_overcurrent_ms[NUM_CHARGING_PORTS] = {0};

esp_err_t sensor_init(void)
{
    // --- ADC1 init (SW1 and SW2) ---
    adc_oneshot_unit_init_cfg_t init_cfg = { .unit_id = ADC_UNIT_1 };
    esp_err_t ret = adc_oneshot_new_unit(&init_cfg, &s_adc1);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "ADC1 init failed: %s", esp_err_to_name(ret));
        return ret;
    }

    adc_oneshot_chan_cfg_t chan_cfg = {
        .bitwidth = ADC_BITWIDTH_12,
        .atten    = ADC_ATTEN_DB_12,  // 0–3.3 V range
    };
    for (int i = 0; i < 2; i++) {
        ret = adc_oneshot_config_channel(s_adc1, CURRENT_CH[i], &chan_cfg);
        if (ret != ESP_OK) {
            ESP_LOGE(LOG_TAG, "ADC current ch%d failed: %s", i, esp_err_to_name(ret));
            return ret;
        }
        ret = adc_oneshot_config_channel(s_adc1, VOLTAGE_CH[i], &chan_cfg);
        if (ret != ESP_OK) {
            ESP_LOGE(LOG_TAG, "ADC voltage ch%d failed: %s", i, esp_err_to_name(ret));
            return ret;
        }
    }

    // --- UART2 init (receive SW3/SW4 data from ESP32-B) ---
    uart_config_t uart_cfg = {
        .baud_rate  = SENSOR_UART_BAUD,
        .data_bits  = UART_DATA_8_BITS,
        .parity     = UART_PARITY_DISABLE,
        .stop_bits  = UART_STOP_BITS_1,
        .flow_ctrl  = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };
    ret = uart_driver_install(SENSOR_UART_PORT, SENSOR_UART_BUF, 0, 0, NULL, 0);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "UART2 install failed: %s", esp_err_to_name(ret));
        return ret;
    }
    uart_param_config(SENSOR_UART_PORT, &uart_cfg);
    uart_set_pin(SENSOR_UART_PORT,
                 SENSOR_UART_TX_GPIO, SENSOR_UART_RX_GPIO,
                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);

    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        s_data[i].port = i + 1;
    }

    ESP_LOGI(LOG_TAG, "Sensor monitor initialized (ADC1 ports 1-2 + ESP32-B UART ports 3-4; all 8 channels live)");
    return ESP_OK;
}

static float _adc_to_current(int raw)
{
    float v = (float)raw * ((float)ADC_VREF_MV / (float)ADC_MAX_VALUE) / 1000.0f;
    float c = (v - CURRENT_SENSOR_VOFFSET) / CURRENT_SENSOR_SENSITIVITY;
    return c < 0.0f ? 0.0f : c;
}

static float _adc_to_voltage(int raw)
{
    float v = (float)raw * ((float)ADC_VREF_MV / (float)ADC_MAX_VALUE) / 1000.0f;
    return v * VOLTAGE_SCALE;
}

// Read and parse the latest complete line from the ESP32-B sensor node.
// Format: "<SW3V>,<SW3I>,<SW4V>,<SW4I>\n"  (raw 12-bit integers, 4 values)
// Four values as of hardware rev 3.0.0: SW4's current is measured for real now
// instead of being stuck at 0 on the WiFi-blocked ADC2.
// Returns true when a valid line was consumed.
static bool _sensor_uart_read(int *sw3v, int *sw3i, int *sw4v, int *sw4i)
{
    static char buf[64];
    static int  pos = 0;

    uint8_t ch;
    bool got = false;

    // Drain all available bytes; keep last valid parse
    while (uart_read_bytes(SENSOR_UART_PORT, &ch, 1, 0) == 1) {
        if (ch == '\n') {
            buf[pos] = '\0';
            int a, b, c, d;
            if (sscanf(buf, "%d,%d,%d,%d", &a, &b, &c, &d) == 4) {
                *sw3v = a;
                *sw3i = b;
                *sw4v = c;
                *sw4i = d;
                got = true;
            }
            pos = 0;
        } else if (pos < (int)(sizeof(buf) - 1)) {
            buf[pos++] = (char)ch;
        } else {
            pos = 0;  // overflow — discard line
        }
    }
    return got;
}

void sensor_sample_all(void)
{
    int raw = 0;

    // SW1 (index 0) and SW2 (index 1) — this board's own ADC1
    for (int i = 0; i < 2; i++) {
        const int idx = LOCAL_PORT_IDX[i];
        if (adc_oneshot_read(s_adc1, CURRENT_CH[i], &raw) == ESP_OK) {
            s_data[idx].current_amps = _adc_to_current(raw);
        }
        if (adc_oneshot_read(s_adc1, VOLTAGE_CH[i], &raw) == ESP_OK) {
            s_data[idx].voltage_volts = _adc_to_voltage(raw);
        }
    }

    // SW3 (index 2) and SW4 (index 3) — measured by ESP32-B, arriving on UART2.
    // Both voltage AND current for both ports, so overcurrent protection is now
    // genuinely active on all four ports (it never was on port 4 before rev 3).
    int sw3v, sw3i, sw4v, sw4i;
    if (_sensor_uart_read(&sw3v, &sw3i, &sw4v, &sw4i)) {
        s_data[2].voltage_volts = _adc_to_voltage(sw3v);
        s_data[2].current_amps  = _adc_to_current(sw3i);
        s_data[3].voltage_volts = _adc_to_voltage(sw4v);
        s_data[3].current_amps  = _adc_to_current(sw4i);
    }

    // Relay state + overcurrent detection
    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        s_data[i].relay_on = relay_port_is_active(i + 1);

        if (s_data[i].current_amps >= CURRENT_OVERCURRENT_AMPS && s_data[i].relay_on) {
            s_overcurrent_ms[i] += SENSOR_SAMPLE_MS;
            if (s_overcurrent_ms[i] >= CURRENT_OVERCURRENT_HOLD_MS) {
                ESP_LOGW(LOG_TAG, "Port %d OVERCURRENT: %.2f A — tripping relay",
                         i + 1, s_data[i].current_amps);
                relay_disable_port(i + 1);
                s_data[i].overcurrent = 1;
            }
        } else {
            s_overcurrent_ms[i] = 0;
            s_data[i].overcurrent = 0;
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
        if (s_data[i].overcurrent) mask |= (1 << i);
    }
    return mask;
}
