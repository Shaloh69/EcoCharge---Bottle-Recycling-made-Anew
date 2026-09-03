#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// EcoCharge Kiosk Controller - Configuration
// ESP32-A "Controller" - WiFi, HTTP, bottle FSM, conveyor, ultrasonics,
//                        WiFi reset button, status LED
//
// HARDWARE REVISION 4.0.0 (2026-08-25) - board constraint + load rebalance
//
// TWO changes from rev 3.0.0, both driven by real constraints:
//
// 1. GPIO36 and GPIO39 DO NOT EXIST on the boards actually being used.
//    Rev 3 put two ultrasonic ECHO lines on them because they are input-only
//    and therefore ideal for ECHO. On these boards the usable range stops at
//    GPIO35. Those ECHO lines moved to GPIO34/35 - still input-only, so the
//    property that made 36/39 attractive is preserved exactly.
//
// 2. The two boards were badly unbalanced. Rev 3 gave ESP32-A eleven jobs and
//    ESP32-B four ADC reads, which wasted a whole microcontroller. Rev 4 splits
//    by SUBSYSTEM instead:
//
//      ESP32-A (this firmware) - the BOTTLE path + all networking
//          WiFi/TLS/HTTP, bottle FSM, conveyor, 3 ultrasonics, reset button, LED
//          13 GPIO
//
//      ESP32-B (esp/esp32_sensor) - the CHARGING path, entirely
//          4 relays + all 8 analog channels (4 ports x voltage+current)
//          14 GPIO
//
//    This is not only more even, it is safer: the overcurrent trip now lives on
//    the same board as the relays it protects, so the safety path no longer
//    crosses a serial link. B also fails its relays OFF if A goes quiet.
//
//    It is also what makes 8 analog channels possible at all. ADC1 offers only
//    four usable channels here (32/33/34/35) now that 36-39 are gone, and ADC2
//    is unusable whenever WiFi is active. B never starts its radio, so B - and
//    only B - can use ADC2. All eight channels therefore live on one board.
// ============================================================================

// ----------------------------------------------------------------------------
// System Identity
// ----------------------------------------------------------------------------
#define LOG_TAG             "ECOCHARGE"
#define FIRMWARE_VERSION    "4.0.0"

// ----------------------------------------------------------------------------
// Conveyor Motor — L298N H-Bridge Driver
// ----------------------------------------------------------------------------
#define MOTOR_IN1_GPIO       19
#define MOTOR_IN2_GPIO       23
#define MOTOR_ENA_GPIO       18
#define MOTOR_LEDC_CHANNEL   LEDC_CHANNEL_0
#define MOTOR_LEDC_TIMER     LEDC_TIMER_0
#define MOTOR_LEDC_MODE      LEDC_LOW_SPEED_MODE
#define MOTOR_LEDC_BITS      LEDC_TIMER_8_BIT
#define MOTOR_PWM_FREQ_HZ    1000
#define MOTOR_DEFAULT_SPEED  100

// Conveyor speed presets (0–100 %)
#define CONVEYOR_SPEED_SCAN    100   // full power
#define CONVEYOR_SPEED_FAST    100   // full power
#define CONVEYOR_SPEED_REVERSE 100   // full power

// ----------------------------------------------------------------------------
// Charging ports - OWNED BY ESP32-B as of rev 4.0.0
// ----------------------------------------------------------------------------
// This board no longer drives the relays or reads any analog channel. Both
// moved to ESP32-B so that the overcurrent trip sits on the same board as the
// relays it cuts. relay_control.c keeps its exact public API (relay_enable_port
// etc.) but now sends a command over UART2 instead of toggling a GPIO, so
// api_client.c and the FSM are unchanged.
#define NUM_CHARGING_PORTS   4
#define RELAY_MAX_ON_SEC     3600

// Kept here because ESP32-A still REPORTS these values in telemetry, and
// because the conversion from raw ADC counts stays on this board - B sends raw
// counts so recalibration only ever means reflashing one board.
#define CURRENT_SENSOR_SENSITIVITY  0.100f
#define CURRENT_SENSOR_VOFFSET      1.65f
#define CURRENT_OVERCURRENT_AMPS    15.0f
#define CURRENT_OVERCURRENT_HOLD_MS 2000
#define VOLTAGE_SCALE        75.76f
#define ADC_VREF_MV          3300
#define ADC_MAX_VALUE        4095

// ----------------------------------------------------------------------------
// Link to ESP32-B "Charging Node" — UART2, BIDIRECTIONAL as of rev 4.0.0
// ----------------------------------------------------------------------------
// B owns the relays and all eight analog channels, so this link carries both
// telemetry in and relay commands out.
//
//   B -> A, every SENSOR_UART_PERIOD_MS:
//     "T,<v1>,<i1>,<v2>,<i2>,<v3>,<i3>,<v4>,<i4>,<relaymask>,<ocmask>\n"
//        eight raw 12-bit ADC counts (0..4095), then two bitmasks where
//        bit0=port1 .. bit3=port4: which relays are on, which have tripped.
//
//   A -> B, on demand:
//     "R,<port>,<0|1>\n"   set one relay (port 1..4)
//     "X\n"                all relays off (fail-safe / shutdown)
//     "P\n"                heartbeat - this controller is alive
//
// A sends a heartbeat every SENSOR_HEARTBEAT_MS. If B hears nothing for
// SENSOR_LINK_TIMEOUT_MS it cuts all relays itself. That is deliberate: a dead
// or unplugged controller must not be able to leave mains switched on.
//
// Wiring (GND MUST be common between the two boards):
//     ESP32-B GPIO17 (TX) ---> ESP32-A GPIO17 (RX)
//     ESP32-B GPIO16 (RX) <--- ESP32-A GPIO4  (TX)
//     ESP32-B GND        <---> ESP32-A GND
#define SENSOR_UART_PORT     UART_NUM_2
#define SENSOR_UART_RX_GPIO  17
#define SENSOR_UART_TX_GPIO   4
#define SENSOR_UART_BAUD     115200
#define SENSOR_UART_BUF      256
#define SENSOR_UART_PERIOD_MS   100   // B's telemetry rate; matches the FSM tick
#define SENSOR_HEARTBEAT_MS     1000  // A -> B "still alive"
#define SENSOR_LINK_TIMEOUT_MS  5000  // B cuts relays if A goes quiet this long

// ----------------------------------------------------------------------------
// Ultrasonic Sensors — HC-SR04 (3 sensors)
// ECHO pins use a 5V→3.3V voltage divider (1kΩ + 2kΩ).
// GPIO36 and GPIO39 are input-only — ideal for ECHO lines.
// ----------------------------------------------------------------------------
// GPIO34/35 are input-only - no output driver, no internal pull-up - which is
// exactly the property that made 36/39 the right choice in rev 3. Those pins
// do not exist on the boards in use, so the ECHO lines moved here.
#define ULTRASONIC_ENTRANCE_TRIG_GPIO   13
#define ULTRASONIC_ENTRANCE_ECHO_GPIO   34   // input-only pin (was 36)
#define ULTRASONIC_BIN_TOP_TRIG_GPIO    14
#define ULTRASONIC_BIN_TOP_ECHO_GPIO    35   // input-only pin (was 39)
#define ULTRASONIC_BIN_BOT_TRIG_GPIO    25
#define ULTRASONIC_BIN_BOT_ECHO_GPIO    26

#define ULTRASONIC_TRIG_PULSE_US        10       // 10 µs trigger pulse
#define ULTRASONIC_TIMEOUT_US           30000    // 30 ms = ~5 m max range
#define ULTRASONIC_MAX_DISTANCE_CM      400.0f

#define ULTRASONIC_ENTRANCE_THRESHOLD_CM  15.0f  // bottle detected if closer than 15 cm
#define ULTRASONIC_BIN_THRESHOLD_CM       20.0f  // bottle-in-bin if closer than 20 cm

// ----------------------------------------------------------------------------
// Bottle FSM
// ----------------------------------------------------------------------------
#define BOTTLE_SCAN_INTERVAL_MS    2000   // nudge bottle every 2 s during scanning
#define BOTTLE_NUDGE_FORWARD_MS     300   // forward pulse duration per nudge
#define BOTTLE_BIN_TIMEOUT_MS      8000   // max time to wait for bin confirmation
#define BOTTLE_FSM_TASK_STACK      4096
#define BOTTLE_FSM_TASK_PRIORITY      6

// SCANNING has no natural exit if no approve/reject command ever arrives
// (browser crash, AI down, or a bottle triggering the entrance sensor with
// no active kiosk session). 60s covers >=4 full worst-case AI attempts
// (the /api/detect proxy caps ~12s each) plus command-poll latency, bounding
// conveyor wear to <=30 nudges instead of unbounded. On timeout, the FSM
// transitions to REJECTING so an unreadable object is physically returned.
// Proposed in AUDIT.md, code implemented 2026-08-11 — not yet flashed
// (explicit hardware sign-off required first, see docs/planning §3.2).
#define BOTTLE_SCAN_TIMEOUT_MS    60000

// CONFIRMING re-check: if DROPPING times out without a bin-sensor hit, a
// single missed ultrasonic reading is indistinguishable from "bottle never
// arrived" — but the bottle may have physically landed with the sensor
// just missing that one echo. Re-sample every 100ms FSM tick for up to
// BOTTLE_BIN_RECHECK_MS, requiring BOTTLE_BIN_CONFIRM_SAMPLES consecutive
// positive reads (debounces a stray echo in either direction) before
// flipping confirmed. Worst case adds ~4s on top of the existing 8s
// DROPPING timeout (~12s total), inside the kiosk's bin-wait UX budget.
// Proposed in AUDIT.md, code implemented 2026-08-11 — not yet flashed.
#define BOTTLE_BIN_RECHECK_MS      4000
#define BOTTLE_BIN_CONFIRM_SAMPLES    3

// ----------------------------------------------------------------------------
// WiFi — Station (credentials saved in NVS; these are compile-time fallbacks)
// ----------------------------------------------------------------------------
#define WIFI_SSID_DEFAULT    "YourWiFi_SSID"
#define WIFI_PASS_DEFAULT    "YourWiFi_Password"
#define WIFI_RECONNECT_MS    5000
#define WIFI_MAX_RETRIES     5

// ----------------------------------------------------------------------------
// WiFi Reset Button — momentary push-button to GND on GPIO22
// ----------------------------------------------------------------------------
// Wiring (2 wires, no external parts needed):
//     ESP32-A GPIO22 ---- [ push button ] ---- GND
// The internal pull-up holds the pin HIGH; pressing pulls it LOW.
// Optional but recommended for a panel-mounted button on a long cable:
// a 100 nF capacitor across the button terminals to suppress contact bounce
// and pick-up noise. The firmware already debounces in software.
//
// GPIO22 chosen deliberately: it is the only free pin on this board that is
// NOT a strapping pin. GPIO0/2/12/15 all influence boot mode or flash voltage,
// so a button that happens to be held during power-on could stop the kiosk
// from booting at all. GPIO22 has no such role.
//
// Behaviour: hold for WIFI_RESET_HOLD_MS, and the saved WiFi credentials are
// erased from NVS and the board reboots straight into the provisioning AP.
// A deliberate hold (not a tap) is required so a knock or a bounce can never
// take a working kiosk off the network.
#define WIFI_RESET_BTN_GPIO      22
#define WIFI_RESET_ACTIVE_LEVEL   0      // pressed = LOW (internal pull-up)
#define WIFI_RESET_HOLD_MS     3000      // hold this long to trigger
#define WIFI_RESET_POLL_MS       50      // debounce/poll interval
#define WIFI_RESET_TASK_STACK  3072
#define WIFI_RESET_TASK_PRIO      3

// ----------------------------------------------------------------------------
// Server identity — set per kiosk unit before flashing
// ----------------------------------------------------------------------------
// Self-hosted on desktop-gklhcri via a Cloudflare quick tunnel (free, no
// domain) — the user has accepted that this URL rotates if the tunnel
// process ever restarts (desktop-gklhcri is meant to stay on permanently).
// If it ever needs updating: check D:\EcoCharge\logs\cloudflared\api-err.log
// on that machine for the current "Your quick Tunnel has been created" URL,
// or move to a named tunnel (docs/planning/03-revamp-master.md §1.1) for a
// stable hostname if this needs to survive an actual restart.
#define RENDER_BASE_URL     "https://clearing-eventually-red-fresh.trycloudflare.com"
// SECRET — do NOT commit a real value here. Both keys below were leaked by
// being committed to this public repository (2026-04-21 .. 2026-08-12) and have
// since been rotated; the old values are dead. Supply the real key at build
// time instead, e.g. a local `secrets.h` that is gitignored, or -D on the
// PlatformIO build_flags. The proper fix is the NVS/provisioning-portal path
// (docs/planning/03-revamp-master.md §2 item 3), same as WiFi credentials.
// The current device key is viewable in the Admin Console's kiosk detail page.
#ifndef DEVICE_API_KEY
#define DEVICE_API_KEY      "SET_AT_BUILD_TIME"
#endif
#define KIOSK_ID            1

// ----------------------------------------------------------------------------
// AI Backend Server
// ----------------------------------------------------------------------------
// Self-hosted on desktop-gklhcri via its own free Cloudflare quick tunnel —
// same rotation caveat as RENDER_BASE_URL above.
#define AI_SERVER_URL       "https://reaches-moral-rates-andrea.trycloudflare.com"
// SECRET — see the note on DEVICE_API_KEY above. Do not commit a real value.
#ifndef AI_API_KEY
#define AI_API_KEY          "SET_AT_BUILD_TIME"
#endif

// ----------------------------------------------------------------------------
// Polling intervals
// ----------------------------------------------------------------------------
#define COMMAND_POLL_MS      2000
#define TELEMETRY_POST_MS    5000
#define SENSOR_SAMPLE_MS     500
#define HEALTH_PING_MS       240000  // ping /health every 4 min to keep Render awake

// ----------------------------------------------------------------------------
// WiFi AP — provisioning captive portal
// ----------------------------------------------------------------------------
#define WIFI_AP_SSID              "EcoCharge_Config"
#define WIFI_AP_PASSWORD          "ecocharge123"
#define WIFI_AP_CHANNEL           1
#define WIFI_AP_MAX_CONNECTIONS   4
#define WIFI_AP_BEACON_INTERVAL   100
#define AP_IP_ADDR                "192.168.4.1"

#define WEB_SERVER_PORT           80

// ----------------------------------------------------------------------------
// Status LED
// ----------------------------------------------------------------------------
#define STATUS_LED_PIN        27
#define LED_BLINK_INIT        100
#define LED_BLINK_ERROR       500
#define LED_SOLID_ON          0
#define LED_OFF              -1

// ----------------------------------------------------------------------------
// Debug UART
// ----------------------------------------------------------------------------
#define UART_PORT_NUM        UART_NUM_0
#define UART_BAUD_RATE       115200

// ----------------------------------------------------------------------------
// Hardware Self-Test
// ----------------------------------------------------------------------------
#define SELFTEST_SENSOR_WAIT_MS   3000   // wait up to 3 s for ESP32-B UART data
#define SELFTEST_MOTOR_SPEED        50   // conveyor speed % during self-test
#define SELFTEST_MOTOR_FWD_MS     1000   // run forward for 1 s
#define SELFTEST_MOTOR_PAUSE_MS    500   // pause between directions
#define SELFTEST_MOTOR_REV_MS     1000   // run reverse for 1 s

// ----------------------------------------------------------------------------
// FreeRTOS task parameters
//
// Priority ladder (httpd default = 5):
//   10  safety      — relay watchdog + LED, must never starve
//    7  command     — admin command poll, fast response
//    6  bottle_fsm  — mechanical FSM
//    5  httpd       — web server (set by ESP-IDF default, not here)
//    4  sensor      — ADC + ultrasonic + ESP32-B UART (below web server!)
//    3  telemetry   — background HTTP posts
// ----------------------------------------------------------------------------
#define SAFETY_TASK_STACK       4096
#define SAFETY_TASK_PRIORITY      10
#define COMMAND_TASK_STACK      6144
#define COMMAND_TASK_PRIORITY      7
#define TELEMETRY_TASK_STACK    6144
#define TELEMETRY_TASK_PRIORITY    3
#define SENSOR_TASK_STACK       4096
#define SENSOR_TASK_PRIORITY       4

#endif // CONFIG_H
