#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// EcoCharge Motor Control System - Configuration
// ============================================================================

// ----------------------------------------------------------------------------
// GPIO Pin Definitions (ESP32 → L298N Motor Driver)
// ----------------------------------------------------------------------------
#define MOTOR_PIN_IN1        25    // Direction control - Forward signal
#define MOTOR_PIN_IN2        26    // Direction control - Backward signal
#define MOTOR_PIN_ENA        27    // Speed control - PWM (Enable A)
#define STATUS_LED_PIN        2    // Built-in LED for status indication

// ----------------------------------------------------------------------------
// Motor Parameters
// ----------------------------------------------------------------------------
#define MOTOR_PWM_FREQ_HZ    1000  // PWM frequency: 1kHz (smooth, quiet operation)
#define MOTOR_PWM_RESOLUTION 10    // PWM resolution: 10-bit (0-1023)
#define MOTOR_MAX_DUTY       100   // Maximum duty cycle: 100%
#define MOTOR_MIN_DUTY       20    // Minimum duty cycle: 20% (overcome static friction)
#define MOTOR_DEFAULT_SPEED  50    // Default speed on startup: 50%

// ----------------------------------------------------------------------------
// MCPWM Configuration
// ----------------------------------------------------------------------------
#define MCPWM_UNIT           MCPWM_UNIT_0      // MCPWM Unit 0
#define MCPWM_TIMER          MCPWM_TIMER_0     // Timer 0
#define MCPWM_OPERATOR       MCPWM_OPR_A       // Operator A
#define MCPWM_IO_SIGNAL      MCPWM0A          // Signal MCPWM0A for GPIO 27

// ----------------------------------------------------------------------------
// Safety Parameters
// ----------------------------------------------------------------------------
#define MOTOR_TIMEOUT_MS     30000  // Maximum continuous runtime: 30 seconds
#define WATCHDOG_TIMEOUT_S   60     // Task watchdog timeout: 60 seconds
#define SAFETY_CHECK_INTERVAL_MS 100  // Safety monitor checks every 100ms

// ----------------------------------------------------------------------------
// Serial Communication
// ----------------------------------------------------------------------------
#define UART_PORT_NUM        UART_NUM_0   // USB serial port
#define UART_BAUD_RATE       115200       // 115200 baud
#define UART_TX_PIN          UART_PIN_NO_CHANGE
#define UART_RX_PIN          UART_PIN_NO_CHANGE
#define UART_BUF_SIZE        1024         // UART buffer size

// ----------------------------------------------------------------------------
// LED Blink Patterns (milliseconds)
// ----------------------------------------------------------------------------
#define LED_BLINK_INIT       100    // Fast blink during initialization
#define LED_BLINK_ERROR      500    // Slow blink on error/timeout
#define LED_SOLID_ON         0      // Solid on when motor running
#define LED_OFF              -1     // Off when motor stopped

// ----------------------------------------------------------------------------
// FreeRTOS Task Configuration
// ----------------------------------------------------------------------------
#define SAFETY_TASK_STACK_SIZE  2048    // Safety monitor task stack size
#define SAFETY_TASK_PRIORITY    5       // Highest priority for safety
#define LED_TASK_STACK_SIZE     1024    // LED task stack size
#define LED_TASK_PRIORITY       1       // Lowest priority

// ----------------------------------------------------------------------------
// Debug Configuration
// ----------------------------------------------------------------------------
#define DEBUG_ENABLE         1      // Enable debug logging (set to 0 for production)
#define LOG_TAG             "MOTOR" // ESP-IDF log tag

#endif // CONFIG_H
