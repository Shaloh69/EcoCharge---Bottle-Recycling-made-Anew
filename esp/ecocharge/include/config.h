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
// (same as your original code)
#define MOTOR_IN1_GPIO       19
#define MOTOR_IN2_GPIO       23
#define MOTOR_ENA_GPIO       18
#define MOTOR_LEDC_CHANNEL   LEDC_CHANNEL_0
#define MOTOR_LEDC_TIMER     LEDC_TIMER_0
#define MOTOR_LEDC_MODE      LEDC_LOW_SPEED_MODE
#define MOTOR_LEDC_BITS      LEDC_TIMER_8_BIT
#define MOTOR_PWM_FREQ_HZ    1000
#define MOTOR_DEFAULT_SPEED  75

// ============================================================================
// Charging Port Pin Assignments (same as original)
// ============================================================================
#define RELAY_PORT1_GPIO     25
#define RELAY_PORT2_GPIO     26
#define RELAY_PORT3_GPIO     16
#define RELAY_PORT4_GPIO      5
#define NUM_CHARGING_PORTS   4
#define RELAY_ACTIVE_LEVEL   0
#define RELAY_MAX_ON_SEC     3600

#define CURRENT_PORT1_ADC_CHANNEL   ADC_CHANNEL_5
#define CURRENT_PORT3_ADC_CHANNEL   ADC_CHANNEL_7
#define CURRENT_SENSOR_SENSITIVITY  0.100f
#define CURRENT_SENSOR_VOFFSET      1.65f
#define CURRENT_OVERCURRENT_AMPS    15.0f
#define CURRENT_OVERCURRENT_HOLD_MS 2000

#define VOLTAGE_PORT1_ADC_CHANNEL   ADC_CHANNEL_4
#define VOLTAGE_PORT3_ADC_CHANNEL   ADC_CHANNEL_6
#define VOLTAGE_SCALE        75.76f
#define ADC_VREF_MV          3300
#define ADC_MAX_VALUE        4095

#define PICO_UART_PORT       UART_NUM_2
#define PICO_UART_RX_GPIO    17
#define PICO_UART_TX_GPIO     4
#define PICO_UART_BAUD       115200
#define PICO_UART_BUF        256

#define WIFI_SSID_DEFAULT    "YourWiFi_SSID"
#define WIFI_PASS_DEFAULT    "YourWiFi_Password"
#define WIFI_RECONNECT_MS    5000
#define WIFI_MAX_RETRIES     10

// ----------------------------------------------------------------------------
// AI Backend Server — Updated for Cloudflare Tunnel
// ----------------------------------------------------------------------------
#define AI_SERVER_URL       "https://ai.yourdomain.com"  // <-- your tunnel URL
#define AI_API_KEY          "your-strong-api-key"        // <-- match start.bat/.env

// ----------------------------------------------------------------------------
// Polling intervals and other settings (same as original)
#define COMMAND_POLL_MS      2000
#define TELEMETRY_POST_MS    5000
#define SENSOR_SAMPLE_MS     500

#define WIFI_AP_SSID              "EcoCharge_Config"
#define WIFI_AP_PASSWORD          "ecocharge123"
#define WIFI_AP_CHANNEL           1
#define WIFI_AP_MAX_CONNECTIONS   4
#define WIFI_AP_BEACON_INTERVAL   100
#define AP_IP_ADDR                "192.168.4.1"

#define WEB_SERVER_PORT           80

#define STATUS_LED_PIN        27
#define LED_BLINK_INIT        100
#define LED_BLINK_ERROR       500
#define LED_SOLID_ON          0
#define LED_OFF              -1

#define UART_PORT_NUM        UART_NUM_0
#define UART_BAUD_RATE       115200

#define SAFETY_TASK_STACK      4096
#define SAFETY_TASK_PRIORITY   10
#define COMMAND_TASK_STACK     6144
#define COMMAND_TASK_PRIORITY  5
#define TELEMETRY_TASK_STACK   6144
#define TELEMETRY_TASK_PRIORITY 4
#define SENSOR_TASK_STACK      4096
#define SENSOR_TASK_PRIORITY   6

#endif // CONFIG_H