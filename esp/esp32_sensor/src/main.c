// ============================================================================
// EcoCharge — ESP32-B "Sensor Node"
//
// Reads four analog channels (charging ports 3 and 4, voltage + current each)
// and streams the raw 12-bit values to ESP32-A over UART2 once per period.
//
// Replaces the Raspberry Pi Pico co-processor used before hardware rev 3.0.0.
// Two real reasons for the swap, both documented in the main firmware's
// config.h and in docs/evidence/hardware-wiring-diagram.md:
//
//   1. The old split left SW4's CURRENT sensor on ESP32-A's ADC2, which is
//      unusable while WiFi is active — so port 4 overcurrent protection never
//      actually worked. Two ESP32s means all eight channels sit on an ADC1.
//   2. One toolchain, one framework, one spare-part to keep on the shelf.
//
// Wire format (ASCII, newline-terminated, one line per SAMPLE_PERIOD_MS):
//
//     "<SW3V>,<SW3I>,<SW4V>,<SW4I>\n"      raw ADC counts, 0..4095
//
// Raw counts are sent deliberately: ESP32-A owns the calibration constants
// (VOLTAGE_SCALE, CURRENT_SENSOR_SENSITIVITY, CURRENT_SENSOR_VOFFSET) and
// applies them. Keeping the conversion in exactly one place means recalibrating
// never requires reflashing two boards.
// ============================================================================

#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "driver/gpio.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_log.h"

#define TAG "ECOCHARGE-B"

#define FIRMWARE_VERSION      "3.0.0"

// ── UART link to ESP32-A ────────────────────────────────────────────────────
// Cross-wired: this board's TX goes to A's RX, and vice versa.
//     ESP32-B GPIO17 (TX) ---> ESP32-A GPIO17 (RX)
//     ESP32-B GPIO16 (RX) <--- ESP32-A GPIO4  (TX)
//     ESP32-B GND        <---> ESP32-A GND     [MANDATORY - common ground]
#define LINK_UART_PORT        UART_NUM_2
#define LINK_UART_TX_GPIO     17
#define LINK_UART_RX_GPIO     16
#define LINK_UART_BAUD        115200
#define LINK_UART_BUF         256

// ── Analog inputs — ALL on ADC1 ─────────────────────────────────────────────
// Same physical pin choices as ESP32-A uses for ports 1-2, so the two boards
// are wired identically and a technician only has to learn one pattern.
//   GPIO32 (ADC1_CH4) — SW3 voltage
//   GPIO33 (ADC1_CH5) — SW3 current
//   GPIO34 (ADC1_CH6) — SW4 voltage
//   GPIO35 (ADC1_CH7) — SW4 current
#define SW3_VOLTAGE_CHANNEL   ADC_CHANNEL_4
#define SW3_CURRENT_CHANNEL   ADC_CHANNEL_5
#define SW4_VOLTAGE_CHANNEL   ADC_CHANNEL_6
#define SW4_CURRENT_CHANNEL   ADC_CHANNEL_7

#define SAMPLE_PERIOD_MS      500
#define OVERSAMPLE_COUNT      8     // mean of N reads to damp ADC noise

static adc_oneshot_unit_handle_t s_adc1;

static const adc_channel_t CHANNELS[4] = {
    SW3_VOLTAGE_CHANNEL,
    SW3_CURRENT_CHANNEL,
    SW4_VOLTAGE_CHANNEL,
    SW4_CURRENT_CHANNEL,
};

static const char *CHANNEL_NAMES[4] = { "SW3V", "SW3I", "SW4V", "SW4I" };

/**
 * Mean of OVERSAMPLE_COUNT reads.
 *
 * The ESP32's SAR ADC is visibly noisy on a single shot, and these readings
 * drive a 15 A overcurrent trip that cuts mains power to a charging port. A
 * spurious high sample must not be able to trip a relay on its own, so the
 * value is averaged here and ESP32-A additionally requires the threshold to be
 * exceeded continuously for CURRENT_OVERCURRENT_HOLD_MS before acting.
 * Returns -1 if every read failed, which A treats as "no data this cycle".
 */
static int read_channel_avg(adc_channel_t ch)
{
    int64_t sum = 0;
    int     ok  = 0;

    for (int i = 0; i < OVERSAMPLE_COUNT; i++) {
        int raw = 0;
        if (adc_oneshot_read(s_adc1, ch, &raw) == ESP_OK) {
            sum += raw;
            ok++;
        }
    }
    return ok > 0 ? (int)(sum / ok) : -1;
}

static esp_err_t adc_setup(void)
{
    adc_oneshot_unit_init_cfg_t init_cfg = { .unit_id = ADC_UNIT_1 };
    esp_err_t ret = adc_oneshot_new_unit(&init_cfg, &s_adc1);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "ADC1 init failed: %s", esp_err_to_name(ret));
        return ret;
    }

    // 12 dB attenuation => roughly 0-3.3 V full scale, matching ESP32-A.
    adc_oneshot_chan_cfg_t chan_cfg = {
        .bitwidth = ADC_BITWIDTH_12,
        .atten    = ADC_ATTEN_DB_12,
    };

    for (int i = 0; i < 4; i++) {
        ret = adc_oneshot_config_channel(s_adc1, CHANNELS[i], &chan_cfg);
        if (ret != ESP_OK) {
            ESP_LOGE(TAG, "ADC channel %s config failed: %s",
                     CHANNEL_NAMES[i], esp_err_to_name(ret));
            return ret;
        }
    }
    return ESP_OK;
}

static esp_err_t uart_setup(void)
{
    uart_config_t cfg = {
        .baud_rate  = LINK_UART_BAUD,
        .data_bits  = UART_DATA_8_BITS,
        .parity     = UART_PARITY_DISABLE,
        .stop_bits  = UART_STOP_BITS_1,
        .flow_ctrl  = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };

    esp_err_t ret = uart_driver_install(LINK_UART_PORT, LINK_UART_BUF, 0, 0, NULL, 0);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "UART driver install failed: %s", esp_err_to_name(ret));
        return ret;
    }
    ESP_ERROR_CHECK(uart_param_config(LINK_UART_PORT, &cfg));
    ESP_ERROR_CHECK(uart_set_pin(LINK_UART_PORT,
                                 LINK_UART_TX_GPIO, LINK_UART_RX_GPIO,
                                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));
    return ESP_OK;
}

void app_main(void)
{
    printf("\n=== EcoCharge Sensor Node (ESP32-B) v%s ===\n", FIRMWARE_VERSION);
    printf("Ports 3 & 4 voltage + current -> UART2 -> ESP32-A\n");
    printf("WiFi is intentionally never started on this board.\n\n");

    ESP_ERROR_CHECK(adc_setup());
    ESP_ERROR_CHECK(uart_setup());

    ESP_LOGI(TAG, "Streaming every %d ms at %d baud", SAMPLE_PERIOD_MS, LINK_UART_BAUD);

    char line[64];

    for (;;) {
        const int sw3v = read_channel_avg(SW3_VOLTAGE_CHANNEL);
        const int sw3i = read_channel_avg(SW3_CURRENT_CHANNEL);
        const int sw4v = read_channel_avg(SW4_VOLTAGE_CHANNEL);
        const int sw4i = read_channel_avg(SW4_CURRENT_CHANNEL);

        // A failed read reports -1; A's parser requires four integers, and a
        // negative value converts to an obviously-wrong reading rather than a
        // plausible one. Skip the line entirely instead: A then keeps its last
        // known values and its own staleness handling applies.
        if (sw3v < 0 || sw3i < 0 || sw4v < 0 || sw4i < 0) {
            ESP_LOGW(TAG, "ADC read failure (%d,%d,%d,%d) — skipping this cycle",
                     sw3v, sw3i, sw4v, sw4i);
        } else {
            const int len = snprintf(line, sizeof(line), "%d,%d,%d,%d\n",
                                     sw3v, sw3i, sw4v, sw4i);
            uart_write_bytes(LINK_UART_PORT, line, len);

            // Mirror to the USB console for bench debugging. Costs nothing in
            // the field (nothing is attached) and saves a logic analyser when
            // someone is chasing a wiring fault.
            ESP_LOGI(TAG, "SW3V=%-4d SW3I=%-4d SW4V=%-4d SW4I=%-4d",
                     sw3v, sw3i, sw4v, sw4i);
        }

        vTaskDelay(pdMS_TO_TICKS(SAMPLE_PERIOD_MS));
    }
}
