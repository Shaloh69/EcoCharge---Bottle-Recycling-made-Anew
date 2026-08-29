#include "relay_control.h"
#include "sensor_monitor.h"
#include "config.h"
#include "driver/uart.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include <stdio.h>
#include <string.h>

// ============================================================================
// Relay control — hardware revision 4.0.0 (2026-08-25)
//
// The relays are no longer wired to this board. They moved to ESP32-B along
// with all eight analog channels, so that the overcurrent trip lives on the
// same microcontroller as the relays it cuts — the safety path no longer
// depends on a serial link staying healthy.
//
// This file therefore keeps its ENTIRE public API unchanged (relay_init,
// relay_enable_port, relay_disable_port, relay_disable_all, relay_check_timeouts,
// relay_port_is_active) and simply sends a one-line command over UART2 instead
// of toggling a GPIO. api_client.c, main.c and the bottle FSM are untouched.
//
// Command format (see config.h for the full protocol):
//     "R,<port>,<0|1>\n"   set one relay, port 1..4
//     "X\n"                all relays off
//
// Duration tracking stays HERE, on the board that receives the server's
// duration_seconds. B enforces its own independent max-on watchdog as a second
// layer, and cuts everything if this board stops sending heartbeats — so a
// crashed or unplugged controller cannot leave mains switched on.
// ============================================================================

typedef struct {
    int        active;
    uint32_t   duration_seconds;  // 0 = unlimited
    TickType_t start_tick;
} relay_state_t;

static relay_state_t s_relays[NUM_CHARGING_PORTS] = {0};

/** Send one line to ESP32-B. The UART driver is installed by sensor_init(). */
static void _send(const char *line)
{
    uart_write_bytes(SENSOR_UART_PORT, line, strlen(line));
}

esp_err_t relay_init(void)
{
    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        s_relays[i].active           = 0;
        s_relays[i].duration_seconds = 0;
    }

    // Explicitly command everything off at startup. B also powers up with all
    // relays off, so this is belt-and-braces against a warm restart of A while
    // B keeps running — the exact case where B could still be holding a relay
    // closed from before the reset.
    _send("X\n");

    ESP_LOGI(LOG_TAG, "Relay control initialized — all ports OFF "
                      "(relays owned by ESP32-B since rev 4.0.0)");
    return ESP_OK;
}

esp_err_t relay_enable_port(uint8_t port, uint32_t duration_seconds)
{
    if (port < 1 || port > NUM_CHARGING_PORTS) {
        return ESP_ERR_INVALID_ARG;
    }

    // Clamp to the hardware maximum. B enforces this independently too, but
    // clamping here keeps the reported duration honest rather than promising
    // the user more time than the watchdog will actually allow.
    if (duration_seconds > RELAY_MAX_ON_SEC) {
        ESP_LOGW(LOG_TAG, "Port %u duration %lus exceeds max %ds — clamping",
                 port, (unsigned long)duration_seconds, RELAY_MAX_ON_SEC);
        duration_seconds = RELAY_MAX_ON_SEC;
    }

    char cmd[16];
    snprintf(cmd, sizeof(cmd), "R,%u,1\n", port);
    _send(cmd);

    s_relays[port - 1].active           = 1;
    s_relays[port - 1].duration_seconds = duration_seconds;
    s_relays[port - 1].start_tick       = xTaskGetTickCount();

    ESP_LOGI(LOG_TAG, "Port %u ON for %lus", port, (unsigned long)duration_seconds);
    return ESP_OK;
}

esp_err_t relay_disable_port(uint8_t port)
{
    if (port < 1 || port > NUM_CHARGING_PORTS) {
        return ESP_ERR_INVALID_ARG;
    }

    char cmd[16];
    snprintf(cmd, sizeof(cmd), "R,%u,0\n", port);
    _send(cmd);

    s_relays[port - 1].active           = 0;
    s_relays[port - 1].duration_seconds = 0;

    ESP_LOGI(LOG_TAG, "Port %u OFF", port);
    return ESP_OK;
}

void relay_disable_all(void)
{
    // One atomic command rather than four, so a UART hiccup cannot leave some
    // ports on when the intent was "everything off".
    _send("X\n");

    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        s_relays[i].active           = 0;
        s_relays[i].duration_seconds = 0;
    }
    ESP_LOGW(LOG_TAG, "All relays OFF");
}

int relay_port_is_active(uint8_t port)
{
    if (port < 1 || port > NUM_CHARGING_PORTS) return 0;

    // Report what ESP32-B says is physically true, not what this board last
    // commanded. They differ exactly when it matters most: B has tripped a port
    // on overcurrent, or B cut everything after losing our heartbeat. Falling
    // back to the commanded state only when B has never reported keeps the
    // telemetry honest at startup instead of claiming ports are off before any
    // report has arrived.
    int reported = sensor_reported_relay_state(port);
    if (reported >= 0) return reported;

    return s_relays[port - 1].active;
}

void relay_check_timeouts(void)
{
    const TickType_t now = xTaskGetTickCount();

    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        if (!s_relays[i].active || s_relays[i].duration_seconds == 0) continue;

        const uint32_t elapsed_s =
            (uint32_t)((now - s_relays[i].start_tick) * portTICK_PERIOD_MS / 1000U);

        if (elapsed_s >= s_relays[i].duration_seconds) {
            ESP_LOGW(LOG_TAG, "Port %d duration elapsed (%lus) — switching OFF",
                     i + 1, (unsigned long)elapsed_s);
            relay_disable_port((uint8_t)(i + 1));
        }
    }
}

/** Heartbeat to B: "the controller is alive, relays may stay closed." */
void relay_send_heartbeat(void)
{
    _send("P\n");
}
