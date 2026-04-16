#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// EcoCharge Kiosk Controller - Configuration
// ESP32 — servo conveyor + 4 charging ports (relay + current + voltage)
// ============================================================================

// ----------------------------------------------------------------------------
// System Identity
// ----------------------------------------------------------------------------
#define LOG_TAG             "ECOCHARGE"
#define FIRMWARE_VERSION    "2.0.0"

// ----------------------------------------------------------------------------
// Conveyor Motor — L298N H-Bridge Driver
//   IN1 / IN2 : direction control (digital outputs)
//   ENA       : LEDC PWM speed control (0–100 %)
//
// Wiring:
//   L298N IN1  → GPIO 19
//   L298N IN2  → GPIO 23
//   L298N ENA  → GPIO 18   (PWM)
//   L298N VCC  → 5 V / motor supply
//   L298N GND  → common GND
// ----------------------------------------------------------------------------
#define MOTOR_IN1_GPIO       19
#define MOTOR_IN2_GPIO       23
#define MOTOR_ENA_GPIO       18
#define MOTOR_LEDC_CHANNEL   LEDC_CHANNEL_0
#define MOTOR_LEDC_TIMER     LEDC_TIMER_0
#define MOTOR_LEDC_MODE      LEDC_LOW_SPEED_MODE
#define MOTOR_LEDC_BITS      LEDC_TIMER_8_BIT    // 8-bit → 0–255 duty
#define MOTOR_PWM_FREQ_HZ    1000                // 1 kHz — standard for L298N
#define MOTOR_DEFAULT_SPEED  75                  // percent (0–100)

// ============================================================================
// Charging Port Pin Assignments
//
// SW1 and SW3 sensors connect directly to ESP32 ADC1 (WiFi-safe).
// SW2 and SW4 sensors connect to a Raspberry Pi Pico which reads them
// and forwards raw 12-bit ADC values to the ESP32 over UART2.
//
// ┌──────┬──────────────────────┬──────────────────────┬──────────────┐
// │ Port │ Voltage              │ Current              │ Relay GPIO   │
// ├──────┼──────────────────────┼──────────────────────┼──────────────┤
// │ SW1  │ GPIO 32 (ADC1_CH4)  │ GPIO 33 (ADC1_CH5)  │ GPIO 25      │
// │ SW2  │ Pico GP26 → UART    │ Pico GP27 → UART    │ GPIO 26      │
// │ SW3  │ GPIO 34 (ADC1_CH6)  │ GPIO 35 (ADC1_CH7)  │ GPIO 16      │
// │ SW4  │ Pico GP28 → UART    │ Pico GP29 → UART    │ GPIO 5       │
// └──────┴──────────────────────┴──────────────────────┴──────────────┘
//
// Pico UART wiring:
//   Pico GP0 (TX) → ESP32 GPIO 17 (RX)
//   Pico GP1 (RX) ← ESP32 GPIO 4  (TX)
//   Pico GND      → ESP32 GND  (shared)
// ============================================================================

// ----------------------------------------------------------------------------
// Relay outputs (active LOW, opto-isolated — pull pin LOW to enable port)
// SW1 and SW2 relay pins moved to GPIO 25/26 to free ADC1 pins 33/35.
// ----------------------------------------------------------------------------
#define RELAY_PORT1_GPIO     25      // SW1 relay  (rewired from GPIO 33)
#define RELAY_PORT2_GPIO     26      // SW2 relay  (rewired from GPIO 35)
#define RELAY_PORT3_GPIO     16      // SW3 relay  (unchanged)
#define RELAY_PORT4_GPIO      5      // SW4 relay  (unchanged)
#define NUM_CHARGING_PORTS   4
#define RELAY_ACTIVE_LEVEL   0       // 0 = active LOW
#define RELAY_MAX_ON_SEC     3600    // max relay on time: 60 minutes

// ----------------------------------------------------------------------------
// Current sensors (ACS712 analog)
// SW1 and SW3 connect directly to ESP32 ADC1.
// SW2 and SW4 connect to Pico ADC (GP27, GP29) and arrive via UART.
// ACS712-20A: sensitivity = 100 mV/A, Voffset = Vcc/2 ≈ 1.65 V
// ----------------------------------------------------------------------------
#define CURRENT_PORT1_ADC_CHANNEL   ADC_CHANNEL_5   // GPIO 33  SW1 — ADC1_CH5
#define CURRENT_PORT3_ADC_CHANNEL   ADC_CHANNEL_7   // GPIO 35  SW3 — ADC1_CH7
#define CURRENT_PORT4_ADC_CHANNEL   ADC_CHANNEL_5   // GPIO 12  SW4 — ADC2_CH5
// SW2 current: Pico GP27 (A1) — received via UART
// SW4 current: ESP32 GPIO 12 (ADC2_CH5) — direct read
// ⚠ GPIO 12 is ADC2 — ADC2 is shared with WiFi on ESP32.
//   Readings may be unreliable while WiFi is active.
//   Add a 10 kΩ pull-down between GPIO12 and GND (boot strapping pin).

#define CURRENT_SENSOR_SENSITIVITY  0.100f   // V/A (ACS712-20A = 100 mV/A)
#define CURRENT_SENSOR_VOFFSET      1.65f    // V at 0A (Vcc/2)
#define CURRENT_OVERCURRENT_AMPS    15.0f    // trip threshold (A)
#define CURRENT_OVERCURRENT_HOLD_MS 2000     // sustained OC before trip

// ----------------------------------------------------------------------------
// Voltage sensors (voltage divider + rectifier)
// SW1 and SW3 connect directly to ESP32 ADC1.
// SW2 and SW4 connect to Pico ADC (GP26, GP28) and arrive via UART.
// Scale: 0–3.3 V ADC → 0–250 V AC (calibrate VOLTAGE_SCALE to your divider)
// ----------------------------------------------------------------------------
#define VOLTAGE_PORT1_ADC_CHANNEL   ADC_CHANNEL_4   // GPIO 32  SW1 — ADC1_CH4
#define VOLTAGE_PORT3_ADC_CHANNEL   ADC_CHANNEL_6   // GPIO 34  SW3 — ADC1_CH6
// SW2 voltage: Pico GP26 (A0) — received via UART
// SW4 voltage: Pico GP28 (A2) — received via UART

#define VOLTAGE_SCALE        75.76f  // multiply ADC voltage → AC RMS voltage
                                     // = 250 V / 3.3 V — calibrate to your divider
#define ADC_VREF_MV          3300    // ADC reference voltage in mV
#define ADC_MAX_VALUE        4095    // 12-bit ADC

// ----------------------------------------------------------------------------
// Pico UART — SW2 and SW4 sensor data received from Raspberry Pi Pico
// Pico GP0(TX) → ESP32 GPIO17(RX),  Pico GP1(RX) ← ESP32 GPIO4(TX)
// Protocol: "<SW2V>,<SW2I>,<SW4V>\n"  (raw 12-bit integers, every 500ms)
// SW4 current is now read directly by ESP32 on GPIO12 — not sent by Pico.
// ----------------------------------------------------------------------------
#define PICO_UART_PORT       UART_NUM_2
#define PICO_UART_RX_GPIO    17      // ESP32 RX ← Pico GP0 (TX)
#define PICO_UART_TX_GPIO     4      // ESP32 TX → Pico GP1 (RX)
#define PICO_UART_BAUD       115200
#define PICO_UART_BUF        256

// ----------------------------------------------------------------------------
// WiFi — Station mode (connects to router for internet access to Render)
// Credentials stored in NVS; defaults used on first boot only.
// ----------------------------------------------------------------------------
#define WIFI_SSID_DEFAULT    "YourWiFi_SSID"
#define WIFI_PASS_DEFAULT    "YourWiFi_Password"
#define WIFI_RECONNECT_MS    5000    // retry interval
#define WIFI_MAX_RETRIES     10

// ----------------------------------------------------------------------------
// Render backend API
// ----------------------------------------------------------------------------
#define RENDER_BASE_URL      "https://ecocharge-server.onrender.com"
#define DEVICE_API_KEY       "esp32-device-secret"   // must match .env on server
#define KIOSK_ID             1

// ----------------------------------------------------------------------------
// Polling intervals
// ----------------------------------------------------------------------------
#define COMMAND_POLL_MS      2000    // poll /api/devices/commands every 2 s
#define TELEMETRY_POST_MS    5000    // post telemetry every 5 s
#define SENSOR_SAMPLE_MS     500     // sample ADC every 500 ms

// ----------------------------------------------------------------------------
// WiFi AP (config/fallback mode — not primary, used for local admin page)
// Connect to EcoCharge_Config to access local admin UI
// ----------------------------------------------------------------------------
#define WIFI_AP_SSID              "EcoCharge_Config"
#define WIFI_AP_PASSWORD          "ecocharge123"
#define WIFI_AP_CHANNEL           1
#define WIFI_AP_MAX_CONNECTIONS   4
#define WIFI_AP_BEACON_INTERVAL   100
#define AP_IP_ADDR                "192.168.4.1"

// ----------------------------------------------------------------------------
// Local web server (admin UI — only accessible on AP network)
// ----------------------------------------------------------------------------
#define WEB_SERVER_PORT           80

// ----------------------------------------------------------------------------
// Status LED
// NOTE: GPIO 2 (built-in LED) is now used for SW3 current sensor.
//       Status LED moved to GPIO 27.  Wire an LED + resistor to GPIO 27,
//       or remove the LED from the circuit if not needed.
//
// LED blink patterns (100 ms frames — see main.c led_mode_t):
//   LED_MODE_FAST   : ·· ·· ··          100 ms toggle — booting / WiFi connecting
//   LED_MODE_SLOW   : ─────·····        500 ms on / 500 ms off — WiFi failed/offline
//   LED_MODE_DOUBLE : ·· ─────────      double-blink, 1.0 s cycle — WiFi ready ✓
//   LED_MODE_TRIPLE : ··· ──────────    triple-blink, 1.2 s cycle — provisioning AP
//   LED_MODE_FIVE   : ····· ──────────  5-blink, 2.0 s cycle — self-test failure
//   LED_MODE_SOLID  : ─────────────     always on — self-test in progress
// ----------------------------------------------------------------------------
#define STATUS_LED_PIN        27     // ← was GPIO 2; moved due to SW3 conflict

// ----------------------------------------------------------------------------
// Self-test configuration (runs on first boot / no WiFi credentials stored)
// ----------------------------------------------------------------------------
#define SELFTEST_PICO_WAIT_MS    1500   // max wait for first valid Pico UART packet
#define SELFTEST_MOTOR_SPEED       50   // % speed used during motor test
#define SELFTEST_MOTOR_FWD_MS    1000   // forward run duration (ms)
#define SELFTEST_MOTOR_PAUSE_MS   500   // pause between directions (ms)
#define SELFTEST_MOTOR_REV_MS    1000   // reverse run duration (ms)

// ----------------------------------------------------------------------------
// Serial / UART (for debug output only)
// ----------------------------------------------------------------------------
#define UART_PORT_NUM        UART_NUM_0
#define UART_BAUD_RATE       115200

// ----------------------------------------------------------------------------
// Ultrasonic Sensors — HC-SR04
//
// Three sensors:
//   Sensor 1 (Entrance)   — detects bottle at belt entry
//   Sensor 2 (Bin Top)    — confirms bottle landed in upper bin region
//   Sensor 3 (Bin Bottom) — confirms bottle landed in lower bin region
//
// TRIG: digital output — 10µs pulse triggers a measurement
// ECHO: digital input  — pulse width proportional to distance
//
// ⚠ HC-SR04 ECHO outputs 5 V. ESP32 GPIO max is 3.3 V.
//   Wire a voltage divider on every ECHO line:
//     ECHO → 1 kΩ → ESP32 pin → 2 kΩ → GND
//   Or use HC-SR04P (3.3 V variant) and skip the dividers.
//
// GPIO 36 (VP) and GPIO 39 (VN) are input-only — safe for ECHO.
// GPIO 15 used as TRIG: initialised LOW, safe after boot.
// GPIO 2  used as ECHO: strapping pin, stays LOW on boot naturally.
// ----------------------------------------------------------------------------
#define ULTRASONIC_ENTRANCE_TRIG_GPIO    13
#define ULTRASONIC_ENTRANCE_ECHO_GPIO    21   // freed from ADS1115 SDA (GPIO36/EN not usable on 30-pin board)

#define ULTRASONIC_BIN_TOP_TRIG_GPIO     14
#define ULTRASONIC_BIN_TOP_ECHO_GPIO     22   // freed from ADS1115 SCL (GPIO39/SP not usable on 30-pin board)

#define ULTRASONIC_BIN_BOT_TRIG_GPIO     15
#define ULTRASONIC_BIN_BOT_ECHO_GPIO      2

// Distance thresholds (centimetres)
#define ULTRASONIC_ENTRANCE_THRESHOLD_CM  15.0f  // < 15 cm → bottle at entrance
#define ULTRASONIC_BIN_THRESHOLD_CM       20.0f  // < 20 cm → bottle in bin
#define ULTRASONIC_MAX_DISTANCE_CM       400.0f  // sensor reliable range

// Timing
#define ULTRASONIC_TRIG_PULSE_US          10     // 10 µs trigger pulse
#define ULTRASONIC_TIMEOUT_US          23200     // ~400 cm round-trip max

// ----------------------------------------------------------------------------
// Bottle FSM — conveyor speed modes and timing
// ----------------------------------------------------------------------------
#define CONVEYOR_SPEED_SCAN       35    // % — slow, scanning mode
#define CONVEYOR_SPEED_FAST       80    // % — approved, dropping into bin
#define CONVEYOR_SPEED_REVERSE    50    // % — rejected, ejecting bottle

#define BOTTLE_NUDGE_FORWARD_MS  400    // belt-on duration per nudge
#define BOTTLE_NUDGE_PAUSE_MS    300    // pause after nudge before photo
#define BOTTLE_SCAN_INTERVAL_MS 2000    // ms between scan attempts
#define BOTTLE_MAX_RETRIES         6    // max AI scan attempts before reject
#define BOTTLE_BIN_TIMEOUT_MS  10000   // ms to wait for bin confirmation

// ----------------------------------------------------------------------------
// FreeRTOS task configuration
// ----------------------------------------------------------------------------
#define SAFETY_TASK_STACK      4096
#define SAFETY_TASK_PRIORITY   10
#define COMMAND_TASK_STACK     6144
#define COMMAND_TASK_PRIORITY  5
#define TELEMETRY_TASK_STACK   6144
#define TELEMETRY_TASK_PRIORITY 4
#define SENSOR_TASK_STACK      4096
#define SENSOR_TASK_PRIORITY   6
#define BOTTLE_FSM_TASK_STACK  4096
#define BOTTLE_FSM_TASK_PRIORITY 7

#endif // CONFIG_H
