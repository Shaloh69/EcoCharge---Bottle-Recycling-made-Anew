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

// ADC1 channels — SW1 and SW3 only (SW2/SW4 come from Pico via UART)
static const adc_channel_t CURRENT_CH[2] = {
    CURRENT_PORT1_ADC_CHANNEL,  // SW1 — GPIO 33
    CURRENT_PORT3_ADC_CHANNEL,  // SW3 — GPIO 35
};
static const adc_channel_t VOLTAGE_CH[2] = {
    VOLTAGE_PORT1_ADC_CHANNEL,  // SW1 — GPIO 32
    VOLTAGE_PORT3_ADC_CHANNEL,  // SW3 — GPIO 34
};

static adc_oneshot_unit_handle_t s_adc1;
static adc_oneshot_unit_handle_t s_adc2; // GPIO 12 — SW4 current (ADC2_CH5)
static port_sensor_data_t s_data[NUM_CHARGING_PORTS] = {0};
static uint32_t s_overcurrent_ms[NUM_CHARGING_PORTS] = {0};

esp_err_t sensor_init(void)
{
    // --- ADC1 init (SW1 and SW3) ---
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

    // --- UART2 init (receive SW2/SW4 data from Pico) ---
    uart_config_t uart_cfg = {
        .baud_rate  = PICO_UART_BAUD,
        .data_bits  = UART_DATA_8_BITS,
        .parity     = UART_PARITY_DISABLE,
        .stop_bits  = UART_STOP_BITS_1,
        .flow_ctrl  = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };
    ret = uart_driver_install(PICO_UART_PORT, PICO_UART_BUF, 0, 0, NULL, 0);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "UART2 install failed: %s", esp_err_to_name(ret));
        return ret;
    }
    uart_param_config(PICO_UART_PORT, &uart_cfg);
    uart_set_pin(PICO_UART_PORT,
                 PICO_UART_TX_GPIO, PICO_UART_RX_GPIO,
                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);

    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        s_data[i].port = i + 1;
    }

    // --- ADC2 init (SW4 current — GPIO 12) ---
    // ⚠ ADC2 is shared with WiFi. Readings will be 0 when WiFi is active.
    //   A 10 kΩ pull-down on GPIO12 is required (boot strapping pin).
    adc_oneshot_unit_init_cfg_t init_cfg2 = { .unit_id = ADC_UNIT_2 };
    ret = adc_oneshot_new_unit(&init_cfg2, &s_adc2);
    if (ret == ESP_OK) {
        ret = adc_oneshot_config_channel(s_adc2, CURRENT_PORT4_ADC_CHANNEL, &chan_cfg);
        if (ret != ESP_OK) {
            ESP_LOGW(LOG_TAG, "ADC2 SW4 current channel config failed: %s (WiFi active?)",
                     esp_err_to_name(ret));
        }
    } else {
        ESP_LOGW(LOG_TAG, "ADC2 init failed: %s — SW4 current will read 0", esp_err_to_name(ret));
    }

    ESP_LOGI(LOG_TAG, "Sensor monitor initialized (ADC1 + ADC2 GPIO12 + Pico UART)");
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

// Read and parse the latest complete line from the Pico.
// Format: "<SW2V>,<SW2I>,<SW4V>\n"  (raw 12-bit integers, 3 values)
// SW4 current is now read directly by ESP32 on GPIO12 — not in this stream.
// Returns true when a valid line was consumed.
static bool _pico_uart_read(int *sw2v, int *sw2i, int *sw4v)
{
    static char buf[64];
    static int  pos = 0;

    uint8_t ch;
    bool got = false;

    // Drain all available bytes; keep last valid parse
    while (uart_read_bytes(PICO_UART_PORT, &ch, 1, 0) == 1) {
        if (ch == '\n') {
            buf[pos] = '\0';
            int a, b, c;
            if (sscanf(buf, "%d,%d,%d", &a, &b, &c) == 3) {
                *sw2v = a;
                *sw2i = b;
                *sw4v = c;
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

    // SW1 (index 0) — ADC1 direct
    if (adc_oneshot_read(s_adc1, CURRENT_CH[0], &raw) == ESP_OK) {
        s_data[0].current_amps = _adc_to_current(raw);
    }
    if (adc_oneshot_read(s_adc1, VOLTAGE_CH[0], &raw) == ESP_OK) {
        s_data[0].voltage_volts = _adc_to_voltage(raw);
    }

    // SW3 (index 2) — ADC1 direct
    if (adc_oneshot_read(s_adc1, CURRENT_CH[1], &raw) == ESP_OK) {
        s_data[2].current_amps = _adc_to_current(raw);
    }
    if (adc_oneshot_read(s_adc1, VOLTAGE_CH[1], &raw) == ESP_OK) {
        s_data[2].voltage_volts = _adc_to_voltage(raw);
    }

    // SW2 (index 1) voltage + current — Pico GP26/GP27 via UART
    // SW4 (index 3) voltage          — Pico GP28 via UART
    int sw2v, sw2i, sw4v;
    if (_pico_uart_read(&sw2v, &sw2i, &sw4v)) {
        s_data[1].voltage_volts = _adc_to_voltage(sw2v);
        s_data[1].current_amps  = _adc_to_current(sw2i);
        s_data[3].voltage_volts = _adc_to_voltage(sw4v);
    }

    // SW4 (index 3) current — ESP32 GPIO 12 (ADC2_CH5)
    // ⚠ ADC2 is unavailable while WiFi is active — will silently read 0.
    if (s_adc2) {
        if (adc_oneshot_read(s_adc2, CURRENT_PORT4_ADC_CHANNEL, &raw) == ESP_OK) {
            s_data[3].current_amps = _adc_to_current(raw);
        }
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
