#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// EcoCharge Kiosk Controller - Configuration
// ESP32 — L298N conveyor + 4 charging ports (relay + current + voltage)
// ============================================================================

// ----------------------------------------------------------------------------
// System Identity
// ----------------------------------------------------------------------------
#define LOG_TAG             "ECOCHARGE"
#define FIRMWARE_VERSION    "2.0.0"

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
// Charging Port Pin Assignments
// ----------------------------------------------------------------------------
#define RELAY_PORT1_GPIO     25
#define RELAY_PORT2_GPIO     26
#define RELAY_PORT3_GPIO     16
#define RELAY_PORT4_GPIO      5
#define NUM_CHARGING_PORTS   4
#define RELAY_ACTIVE_LEVEL   0
#define RELAY_MAX_ON_SEC     3600

// ADC1 — SW1 (GPIO33, ch5) and SW3 (GPIO35, ch7)
#define CURRENT_PORT1_ADC_CHANNEL   ADC_CHANNEL_5   // GPIO33
#define CURRENT_PORT3_ADC_CHANNEL   ADC_CHANNEL_7   // GPIO35
// ADC2 — SW4 current (GPIO12, ch5). Unavailable while WiFi is active.
#define CURRENT_PORT4_ADC_CHANNEL   ADC_CHANNEL_5   // GPIO12 on ADC2

#define CURRENT_SENSOR_SENSITIVITY  0.100f
#define CURRENT_SENSOR_VOFFSET      1.65f
#define CURRENT_OVERCURRENT_AMPS    15.0f
#define CURRENT_OVERCURRENT_HOLD_MS 2000

#define VOLTAGE_PORT1_ADC_CHANNEL   ADC_CHANNEL_4   // GPIO32
#define VOLTAGE_PORT3_ADC_CHANNEL   ADC_CHANNEL_6   // GPIO34
#define VOLTAGE_SCALE        75.76f
#define ADC_VREF_MV          3300
#define ADC_MAX_VALUE        4095

// ----------------------------------------------------------------------------
// Pico UART — SW2/SW4 voltage data
// ----------------------------------------------------------------------------
#define PICO_UART_PORT       UART_NUM_2
#define PICO_UART_RX_GPIO    17
#define PICO_UART_TX_GPIO     4
#define PICO_UART_BAUD       115200
#define PICO_UART_BUF        256

// ----------------------------------------------------------------------------
// Ultrasonic Sensors — HC-SR04 (3 sensors)
// ECHO pins use a 5V→3.3V voltage divider (1kΩ + 2kΩ).
// GPIO36 and GPIO39 are input-only — ideal for ECHO lines.
// ----------------------------------------------------------------------------
#define ULTRASONIC_ENTRANCE_TRIG_GPIO   13
#define ULTRASONIC_ENTRANCE_ECHO_GPIO   36   // input-only pin
#define ULTRASONIC_BIN_TOP_TRIG_GPIO    14
#define ULTRASONIC_BIN_TOP_ECHO_GPIO    39   // input-only pin
#define ULTRASONIC_BIN_BOT_TRIG_GPIO    15
#define ULTRASONIC_BIN_BOT_ECHO_GPIO    21

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

// ----------------------------------------------------------------------------
// WiFi — Station (credentials saved in NVS; these are compile-time fallbacks)
// ----------------------------------------------------------------------------
#define WIFI_SSID_DEFAULT    "YourWiFi_SSID"
#define WIFI_PASS_DEFAULT    "YourWiFi_Password"
#define WIFI_RECONNECT_MS    5000
#define WIFI_MAX_RETRIES     5

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
#define RENDER_BASE_URL     "https://lap-trace-reach-forwarding.trycloudflare.com"
#define DEVICE_API_KEY      "SET_AT_BUILD_TIME"
#define KIOSK_ID            1

// ----------------------------------------------------------------------------
// AI Backend Server
// ----------------------------------------------------------------------------
// Self-hosted on desktop-gklhcri via its own free Cloudflare quick tunnel —
// same rotation caveat as RENDER_BASE_URL above.
#define AI_SERVER_URL       "https://recipient-beliefs-landscapes-established.trycloudflare.com"
#define AI_API_KEY          "SET_AT_BUILD_TIME"

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
#define SELFTEST_PICO_WAIT_MS     3000   // wait up to 3 s for Pico UART data
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
//    4  sensor      — ADC + ultrasonic + Pico UART (below web server!)
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
