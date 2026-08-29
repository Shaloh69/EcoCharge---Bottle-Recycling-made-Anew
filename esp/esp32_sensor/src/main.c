// ============================================================================
// EcoCharge — ESP32-B "Charging Node"
//
// Owns the ENTIRE charging subsystem: the four port relays and all eight analog
// channels (4 ports x voltage + current). Talks to ESP32-A over UART2.
//
// HARDWARE REVISION 4.0.0 (2026-08-25). Rev 3 made this board a bare sensor
// bridge reading four channels — four GPIO and nothing else — while ESP32-A
// carried everything. That wasted a whole microcontroller. Rev 4 splits by
// subsystem: A owns the bottle path and networking, B owns charging.
//
// Two things this buys beyond an even workload:
//
//   1. ALL EIGHT ANALOG CHANNELS FIT. ADC1 has only four usable channels on the
//      boards in use (32/33/34/35 — GPIO36-39 do not exist on them), and ADC2
//      is unusable whenever WiFi is active. This board NEVER starts its radio,
//      so it is the only one that can use ADC2. Four channels on ADC1, four on
//      ADC2, all eight genuinely measured.
//
//   2. THE OVERCURRENT TRIP IS LOCAL. The relay and the current sensor that
//      protects it are now on the same microcontroller, so tripping never waits
//      on a serial link. A dropped or corrupted UART frame can no longer delay
//      cutting mains power.
//
// Protocol (ASCII, newline-terminated):
//
//   B -> A, every SAMPLE_PERIOD_MS:
//     "T,<v1>,<i1>,<v2>,<i2>,<v3>,<i3>,<v4>,<i4>,<relaymask>,<ocmask>\n"
//        eight raw 12-bit ADC counts; two bitmasks, bit0=port1..bit3=port4.
//
//   A -> B:
//     "R,<port>,<0|1>\n"   set one relay (port 1..4)
//     "X\n"                all relays off
//     "P\n"                heartbeat — A is alive
//
// Raw counts are sent, not volts and amps: A owns the calibration constants, so
// recalibrating the sensors means reflashing one board rather than two. B keeps
// only the raw threshold it needs for its own trip.
// ============================================================================

#include <stdio.h>
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "driver/gpio.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_log.h"
#include "esp_timer.h"

#define TAG "ECOCHARGE-B"
#define FIRMWARE_VERSION "4.0.0"

// ── UART link to ESP32-A ────────────────────────────────────────────────────
//     ESP32-B GPIO17 (TX) ---> ESP32-A GPIO17 (RX)
//     ESP32-B GPIO16 (RX) <--- ESP32-A GPIO4  (TX)
//     ESP32-B GND        <---> ESP32-A GND     [MANDATORY]
#define LINK_UART_PORT     UART_NUM_2
#define LINK_UART_TX_GPIO  17
#define LINK_UART_RX_GPIO  16
#define LINK_UART_BAUD     115200
#define LINK_UART_BUF      512

// ── Relays — active LOW, same convention as rev 3 on ESP32-A ────────────────
#define NUM_PORTS          4
#define RELAY_ACTIVE_LEVEL 0
static const int RELAY_GPIO[NUM_PORTS] = { 19, 23, 18, 5 };

// ── Analog: four on ADC1, four on ADC2 (usable because WiFi never starts) ───
//   ADC1: GPIO32 CH4 | GPIO33 CH5 | GPIO34 CH6 | GPIO35 CH7
//   ADC2: GPIO25 CH8 | GPIO26 CH9 | GPIO27 CH7 | GPIO14 CH6
static const adc_channel_t ADC1_CH[4] = {   // SW1 V, SW1 I, SW2 V, SW2 I
    ADC_CHANNEL_4, ADC_CHANNEL_5, ADC_CHANNEL_6, ADC_CHANNEL_7,
};
static const adc_channel_t ADC2_CH[4] = {   // SW3 V, SW3 I, SW4 V, SW4 I
    ADC_CHANNEL_8, ADC_CHANNEL_9, ADC_CHANNEL_7, ADC_CHANNEL_6,
};

#define SAMPLE_PERIOD_MS   100    // matches ESP32-A's FSM tick
#define OVERSAMPLE_COUNT   8

// ── Safety ─────────────────────────────────────────────────────────────────
// Raw-count equivalent of the 15 A trip, derived with the same constants A
// uses: raw = (offset + amps * sensitivity) / vref * 4095
//           = (1.65 + 15.0 * 0.100) / 3.3 * 4095 = ~3908
#define OVERCURRENT_RAW        3908
#define OVERCURRENT_HOLD_MS    2000
#define LINK_TIMEOUT_MS        5000    // A silent this long -> cut everything
#define MAX_ON_MS              3600000 // independent 1-hour ceiling per port

static adc_oneshot_unit_handle_t s_adc1, s_adc2;

static bool     s_relay_on[NUM_PORTS]   = {false};
static bool     s_tripped[NUM_PORTS]    = {false};
static uint32_t s_oc_ms[NUM_PORTS]      = {0};
static int64_t  s_on_since_us[NUM_PORTS] = {0};
static int64_t  s_last_heard_us         = 0;
static bool     s_link_up               = false;

// ---------------------------------------------------------------------------
// Relays
// ---------------------------------------------------------------------------
static void relay_apply(int idx, bool on)
{
    gpio_set_level(RELAY_GPIO[idx], on ? RELAY_ACTIVE_LEVEL : !RELAY_ACTIVE_LEVEL);
    s_relay_on[idx] = on;
    s_on_since_us[idx] = on ? esp_timer_get_time() : 0;
}

static void relays_all_off(const char *reason)
{
    bool any = false;
    for (int i = 0; i < NUM_PORTS; i++) {
        if (s_relay_on[i]) any = true;
        relay_apply(i, false);
    }
    if (any) ESP_LOGW(TAG, "ALL RELAYS OFF — %s", reason);
}

static void relays_init(void)
{
    gpio_config_t cfg = {
        .mode         = GPIO_MODE_OUTPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    for (int i = 0; i < NUM_PORTS; i++) {
        cfg.pin_bit_mask = 1ULL << RELAY_GPIO[i];
        ESP_ERROR_CHECK(gpio_config(&cfg));
        // Drive OFF before anything else can run. Relays must be de-energised
        // on every boot, including a watchdog reset mid-charge.
        relay_apply(i, false);
    }
    ESP_LOGI(TAG, "Relays initialised — all OFF (GPIO %d/%d/%d/%d, active LOW)",
             RELAY_GPIO[0], RELAY_GPIO[1], RELAY_GPIO[2], RELAY_GPIO[3]);
}

// ---------------------------------------------------------------------------
// ADC
// ---------------------------------------------------------------------------
static int read_avg(adc_oneshot_unit_handle_t unit, adc_channel_t ch)
{
    int64_t sum = 0;
    int ok = 0;
    for (int i = 0; i < OVERSAMPLE_COUNT; i++) {
        int raw = 0;
        if (adc_oneshot_read(unit, ch, &raw) == ESP_OK) { sum += raw; ok++; }
    }
    return ok ? (int)(sum / ok) : -1;
}

static void adc_init(void)
{
    adc_oneshot_chan_cfg_t chan = {
        .bitwidth = ADC_BITWIDTH_12,
        .atten    = ADC_ATTEN_DB_12,
    };

    adc_oneshot_unit_init_cfg_t c1 = { .unit_id = ADC_UNIT_1 };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&c1, &s_adc1));
    for (int i = 0; i < 4; i++)
        ESP_ERROR_CHECK(adc_oneshot_config_channel(s_adc1, ADC1_CH[i], &chan));

    // ADC2 is only safe here because this board never calls esp_wifi_init().
    // If WiFi is ever added to this firmware, these four channels stop working
    // and half the charging telemetry silently reads garbage.
    adc_oneshot_unit_init_cfg_t c2 = { .unit_id = ADC_UNIT_2 };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&c2, &s_adc2));
    for (int i = 0; i < 4; i++)
        ESP_ERROR_CHECK(adc_oneshot_config_channel(s_adc2, ADC2_CH[i], &chan));

    ESP_LOGI(TAG, "ADC ready — 4 channels on ADC1, 4 on ADC2 (WiFi never started)");
}

// ---------------------------------------------------------------------------
// UART
// ---------------------------------------------------------------------------
static void uart_init(void)
{
    uart_config_t cfg = {
        .baud_rate  = LINK_UART_BAUD,
        .data_bits  = UART_DATA_8_BITS,
        .parity     = UART_PARITY_DISABLE,
        .stop_bits  = UART_STOP_BITS_1,
        .flow_ctrl  = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };
    ESP_ERROR_CHECK(uart_driver_install(LINK_UART_PORT, LINK_UART_BUF, LINK_UART_BUF, 0, NULL, 0));
    ESP_ERROR_CHECK(uart_param_config(LINK_UART_PORT, &cfg));
    ESP_ERROR_CHECK(uart_set_pin(LINK_UART_PORT, LINK_UART_TX_GPIO, LINK_UART_RX_GPIO,
                                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));
}

/** Consume every buffered command from ESP32-A. */
static void process_commands(void)
{
    static char buf[64];
    static int  pos = 0;

    uint8_t ch;
    while (uart_read_bytes(LINK_UART_PORT, &ch, 1, 0) == 1) {
        if (ch != '\n') {
            if (pos < (int)sizeof(buf) - 1) buf[pos++] = (char)ch;
            else pos = 0;
            continue;
        }
        buf[pos] = '\0';
        pos = 0;

        // Any well-formed line proves A is alive, not just an explicit "P".
        s_last_heard_us = esp_timer_get_time();
        if (!s_link_up) {
            s_link_up = true;
            ESP_LOGI(TAG, "Link UP — commands arriving from ESP32-A");
        }

        if (buf[0] == 'P') continue;

        if (buf[0] == 'X') { relays_all_off("commanded by ESP32-A"); continue; }

        int port = 0, on = 0;
        if (buf[0] == 'R' && sscanf(buf, "R,%d,%d", &port, &on) == 2 &&
            port >= 1 && port <= NUM_PORTS) {
            const int idx = port - 1;

            // A tripped port stays off until explicitly switched off and on
            // again. Otherwise a server retry loop could re-close a relay into
            // a genuine fault every few seconds.
            if (on && s_tripped[idx]) {
                ESP_LOGW(TAG, "Port %d ON refused — still tripped; send OFF first", port);
                continue;
            }
            if (!on) s_tripped[idx] = false;

            relay_apply(idx, on != 0);
            ESP_LOGI(TAG, "Port %d -> %s", port, on ? "ON" : "OFF");
        }
    }
}

// ---------------------------------------------------------------------------
static void safety_check(const int *current_raw)
{
    const int64_t now = esp_timer_get_time();

    for (int i = 0; i < NUM_PORTS; i++) {
        if (!s_relay_on[i]) { s_oc_ms[i] = 0; continue; }

        if (current_raw[i] >= OVERCURRENT_RAW) {
            s_oc_ms[i] += SAMPLE_PERIOD_MS;
            if (s_oc_ms[i] >= OVERCURRENT_HOLD_MS) {
                ESP_LOGE(TAG, "Port %d OVERCURRENT (raw %d >= %d for %lu ms) — CUTTING",
                         i + 1, current_raw[i], OVERCURRENT_RAW,
                         (unsigned long)s_oc_ms[i]);
                relay_apply(i, false);
                s_tripped[i] = true;
                s_oc_ms[i]   = 0;
            }
        } else {
            s_oc_ms[i] = 0;
        }

        // Independent ceiling. A tracks the server-issued duration, but if A
        // hangs with a relay closed nothing else would ever open it.
        if (s_relay_on[i] && s_on_since_us[i] &&
            (now - s_on_since_us[i]) / 1000 > MAX_ON_MS) {
            ESP_LOGE(TAG, "Port %d exceeded max-on ceiling — CUTTING", i + 1);
            relay_apply(i, false);
        }
    }

    if (s_link_up && (now - s_last_heard_us) / 1000 > LINK_TIMEOUT_MS) {
        s_link_up = false;
        relays_all_off("ESP32-A silent — link timeout");
    }
}

void app_main(void)
{
    printf("\n=== EcoCharge Charging Node (ESP32-B) v%s ===\n", FIRMWARE_VERSION);
    printf("Owns: 4 relays + all 8 analog channels (ports 1-4 voltage + current)\n");
    printf("WiFi is intentionally never started - that is what frees ADC2.\n\n");

    relays_init();      // relays OFF first, before anything can fail
    adc_init();
    uart_init();

    s_last_heard_us = esp_timer_get_time();

    ESP_LOGI(TAG, "Streaming every %d ms at %d baud; overcurrent raw>=%d for %d ms; "
                  "link timeout %d ms",
             SAMPLE_PERIOD_MS, LINK_UART_BAUD, OVERCURRENT_RAW,
             OVERCURRENT_HOLD_MS, LINK_TIMEOUT_MS);

    char line[160];
    int  v[4], cur[4];
    int  log_div = 0;

    for (;;) {
        process_commands();

        bool ok = true;

        // SW1/SW2 on ADC1 (V,I,V,I) and SW3/SW4 on ADC2 (V,I,V,I)
        const int a1v1 = read_avg(s_adc1, ADC1_CH[0]);
        const int a1i1 = read_avg(s_adc1, ADC1_CH[1]);
        const int a1v2 = read_avg(s_adc1, ADC1_CH[2]);
        const int a1i2 = read_avg(s_adc1, ADC1_CH[3]);
        const int a2v3 = read_avg(s_adc2, ADC2_CH[0]);
        const int a2i3 = read_avg(s_adc2, ADC2_CH[1]);
        const int a2v4 = read_avg(s_adc2, ADC2_CH[2]);
        const int a2i4 = read_avg(s_adc2, ADC2_CH[3]);

        const int raw[8] = { a1v1, a1i1, a1v2, a1i2, a2v3, a2i3, a2v4, a2i4 };
        for (int i = 0; i < 8; i++) if (raw[i] < 0) ok = false;

        if (!ok) {
            // Skip the frame rather than send a value A would convert into a
            // plausible-looking reading. A keeps its last values and its own
            // link-timeout applies.
            ESP_LOGW(TAG, "ADC read failure — skipping frame");
        } else {
            v[0] = a1v1; cur[0] = a1i1;
            v[1] = a1v2; cur[1] = a1i2;
            v[2] = a2v3; cur[2] = a2i3;
            v[3] = a2v4; cur[3] = a2i4;

            safety_check(cur);

            int relaymask = 0, ocmask = 0;
            for (int i = 0; i < NUM_PORTS; i++) {
                if (s_relay_on[i]) relaymask |= (1 << i);
                if (s_tripped[i])  ocmask    |= (1 << i);
            }

            const int len = snprintf(line, sizeof(line),
                "T,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d\n",
                v[0], cur[0], v[1], cur[1], v[2], cur[2], v[3], cur[3],
                relaymask, ocmask);
            uart_write_bytes(LINK_UART_PORT, line, len);

            // Console mirror once a second, not every 100 ms — at 10 Hz this
            // would flood the log and hide anything else.
            if (++log_div >= (1000 / SAMPLE_PERIOD_MS)) {
                log_div = 0;
                ESP_LOGI(TAG, "V/I  1:%d/%d  2:%d/%d  3:%d/%d  4:%d/%d  relays=0x%X oc=0x%X link=%s",
                         v[0], cur[0], v[1], cur[1], v[2], cur[2], v[3], cur[3],
                         relaymask, ocmask, s_link_up ? "up" : "DOWN");
            }
        }

        vTaskDelay(pdMS_TO_TICKS(SAMPLE_PERIOD_MS));
    }
}
