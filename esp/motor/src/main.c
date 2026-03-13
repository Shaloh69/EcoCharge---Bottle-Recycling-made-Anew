#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "motor_control.h"
#include "config.h"
#include "wifi_ap.h"
#include "web_server.h"

// ============================================================================
// EcoCharge Motor Control System - Main Application
// ============================================================================

// LED blink control
static int led_blink_period_ms = LED_OFF;

// ----------------------------------------------------------------------------
// Safety Monitor Task
// ----------------------------------------------------------------------------
/**
 * @brief Safety monitor task - checks for timeout and manages LED
 *
 * This task runs continuously to monitor motor runtime and enforce the
 * safety timeout. It also controls the status LED blink pattern.
 */
static void safety_monitor_task(void *arg) {
    ESP_LOGI(LOG_TAG, "Safety monitor task started");

    TickType_t last_blink_time = 0;
    int led_state = 0;

    while (1) {
        // Check motor runtime for timeout
        if (motor_is_running()) {
            uint32_t runtime = motor_get_runtime_ms();

            if (runtime > MOTOR_TIMEOUT_MS) {
                ESP_LOGW(LOG_TAG, "Motor timeout! Runtime: %lu ms", (unsigned long)runtime);
                motor_emergency_stop();
                led_blink_period_ms = LED_BLINK_ERROR;
            }
        }

        // Handle LED blinking
        TickType_t current_time = xTaskGetTickCount();

        if (led_blink_period_ms > 0) {
            // Blinking mode
            if ((current_time - last_blink_time) >= pdMS_TO_TICKS(led_blink_period_ms)) {
                led_state = !led_state;
                gpio_set_level(STATUS_LED_PIN, led_state);
                last_blink_time = current_time;
            }
        } else if (led_blink_period_ms == LED_SOLID_ON) {
            // Solid on (motor running - controlled by motor_control.c)
            // Do nothing here, motor control handles it
        } else {
            // LED off (motor stopped - controlled by motor_control.c)
            // Do nothing here, motor control handles it
        }

        // Check every 100ms
        vTaskDelay(pdMS_TO_TICKS(SAFETY_CHECK_INTERVAL_MS));
    }
}

// ----------------------------------------------------------------------------
// Serial Command Processing
// ----------------------------------------------------------------------------

/**
 * @brief Print command help
 */
static void print_help(void) {
    printf("\n========================================\n");
    printf("  EcoCharge Motor Control Commands\n");
    printf("========================================\n");
    printf("F or f  - Forward at current speed\n");
    printf("B or b  - Backward at current speed\n");
    printf("S or s  - Stop motor\n");
    printf("0-9     - Set speed (0=stop, 9=90%%)\n");
    printf("+       - Increase speed by 10%%\n");
    printf("-       - Decrease speed by 10%%\n");
    printf("?       - Print current status\n");
    printf("H or h  - Print this help\n");
    printf("========================================\n\n");
}

/**
 * @brief Print motor status
 */
static void print_status(void) {
    motor_status_t status;
    esp_err_t ret = motor_get_status(&status);

    if (ret != ESP_OK) {
        printf("Error: Failed to get motor status\n");
        return;
    }

    printf("\n--- Motor Status ---\n");

    // State
    switch (status.state) {
        case MOTOR_STOPPED:
            printf("State:    STOPPED\n");
            break;
        case MOTOR_FORWARD:
            printf("State:    FORWARD\n");
            break;
        case MOTOR_BACKWARD:
            printf("State:    BACKWARD\n");
            break;
        default:
            printf("State:    UNKNOWN\n");
    }

    printf("Speed:    %d%%\n", status.speed);
    printf("Runtime:  %lu ms\n", (unsigned long)status.runtime_ms);
    printf("Running:  %s\n", status.is_running ? "YES" : "NO");
    printf("Timeout:  %s\n", status.timeout_occurred ? "YES (call 'S' to reset)" : "NO");
    printf("--------------------\n\n");
}

/**
 * @brief Process a single character command
 *
 * @param cmd Command character
 */
static void process_command(char cmd) {
    esp_err_t ret;
    motor_status_t status;
    motor_get_status(&status);
    uint8_t new_speed;

    switch (cmd) {
        case 'F':
        case 'f':
            // Move forward
            ret = motor_forward(status.speed);
            if (ret == ESP_OK) {
                printf("Motor: FORWARD at %d%%\n", status.speed);
            } else {
                printf("Error: Failed to start forward\n");
            }
            break;

        case 'B':
        case 'b':
            // Move backward
            ret = motor_backward(status.speed);
            if (ret == ESP_OK) {
                printf("Motor: BACKWARD at %d%%\n", status.speed);
            } else {
                printf("Error: Failed to start backward\n");
            }
            break;

        case 'S':
        case 's':
            // Stop motor
            ret = motor_stop();
            if (ret == ESP_OK) {
                printf("Motor: STOPPED\n");
                led_blink_period_ms = LED_OFF;
                motor_reset_timeout();
            } else {
                printf("Error: Failed to stop motor\n");
            }
            break;

        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            // Set speed
            new_speed = (cmd - '0') * 10;
            if (new_speed == 0) {
                motor_stop();
                printf("Motor: STOPPED (speed set to 0%%)\n");
            } else {
                ret = motor_set_speed(new_speed);
                if (ret == ESP_OK) {
                    printf("Speed set to: %d%%\n", new_speed);
                } else {
                    printf("Error: Failed to set speed\n");
                }
            }
            break;

        case '+':
            // Increase speed
            motor_get_status(&status);
            new_speed = status.speed + 10;
            if (new_speed > 100) {
                new_speed = 100;
            }
            ret = motor_set_speed(new_speed);
            if (ret == ESP_OK) {
                printf("Speed increased to: %d%%\n", new_speed);
            } else {
                printf("Error: Failed to increase speed\n");
            }
            break;

        case '-':
            // Decrease speed
            motor_get_status(&status);
            if (status.speed >= 10) {
                new_speed = status.speed - 10;
            } else {
                new_speed = 0;
            }

            if (new_speed == 0) {
                motor_stop();
                printf("Motor: STOPPED (speed decreased to 0%%)\n");
            } else {
                ret = motor_set_speed(new_speed);
                if (ret == ESP_OK) {
                    printf("Speed decreased to: %d%%\n", new_speed);
                } else {
                    printf("Error: Failed to decrease speed\n");
                }
            }
            break;

        case '?':
            // Print status
            print_status();
            break;

        case 'H':
        case 'h':
            // Print help
            print_help();
            break;

        case '\r':
        case '\n':
            // Ignore newlines
            break;

        default:
            printf("Unknown command: '%c' (press 'H' for help)\n", cmd);
            break;
    }
}

// ----------------------------------------------------------------------------
// UART Initialization
// ----------------------------------------------------------------------------
/**
 * @brief Initialize UART for serial communication
 */
static esp_err_t uart_init_console(void) {
    const uart_config_t uart_config = {
        .baud_rate = UART_BAUD_RATE,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };

    esp_err_t ret = uart_driver_install(UART_PORT_NUM, UART_BUF_SIZE * 2, 0, 0, NULL, 0);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "Failed to install UART driver: %s", esp_err_to_name(ret));
        return ret;
    }

    ret = uart_param_config(UART_PORT_NUM, &uart_config);
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "Failed to configure UART: %s", esp_err_to_name(ret));
        return ret;
    }

    return ESP_OK;
}

// ----------------------------------------------------------------------------
// Main Application
// ----------------------------------------------------------------------------
void app_main(void) {
    esp_err_t ret;

    // Print startup banner
    printf("\n\n");
    printf("========================================\n");
    printf("  EcoCharge Motor Control System\n");
    printf("  ESP32 + L298N Motor Driver\n");
    printf("========================================\n\n");

    // Blink LED fast during initialization
    led_blink_period_ms = LED_BLINK_INIT;

    // Initialize NVS (required for some ESP-IDF components)
    ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_LOGW(LOG_TAG, "NVS partition was truncated, erasing...");
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    // Initialize UART for serial communication
    ESP_LOGI(LOG_TAG, "Initializing UART...");
    ret = uart_init_console();
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "UART initialization failed, restarting...");
        vTaskDelay(pdMS_TO_TICKS(5000));
        esp_restart();
    }

    // Initialize motor control
    ESP_LOGI(LOG_TAG, "Initializing motor control...");
    ret = motor_init();
    if (ret != ESP_OK) {
        ESP_LOGE(LOG_TAG, "Motor initialization failed: %s", esp_err_to_name(ret));
        led_blink_period_ms = LED_BLINK_ERROR;
        printf("ERROR: Motor initialization failed!\n");
        printf("Please check hardware connections and restart.\n");
        while (1) {
            vTaskDelay(pdMS_TO_TICKS(1000));
        }
    }

    // Stop LED blinking - initialization complete
    led_blink_period_ms = LED_OFF;

    // Create safety monitor task
    ESP_LOGI(LOG_TAG, "Creating safety monitor task...");
    xTaskCreate(safety_monitor_task, "safety_monitor", SAFETY_TASK_STACK_SIZE,
                NULL, SAFETY_TASK_PRIORITY, NULL);

    // Initialize WiFi Access Point
    ESP_LOGI(LOG_TAG, "Starting WiFi Access Point...");
    ret = wifi_ap_init();
    if (ret != ESP_OK) {
        ESP_LOGW(LOG_TAG, "WiFi AP initialization failed: %s", esp_err_to_name(ret));
        printf("WARNING: WiFi AP failed to start\n");
    }

    // Start Web Server
    ESP_LOGI(LOG_TAG, "Starting web server...");
    ret = web_server_start();
    if (ret != ESP_OK) {
        ESP_LOGW(LOG_TAG, "Web server start failed: %s", esp_err_to_name(ret));
        printf("WARNING: Web server failed to start\n");
    } else {
        printf("\n");
        printf("========================================\n");
        printf("  📱 WiFi Control Available!\n");
        printf("========================================\n");
        printf("1. Connect phone to WiFi:\n");
        printf("   Network: EcoCharge-Motor\n");
        printf("   Password: motor123\n");
        printf("\n");
        printf("2. Open browser and go to:\n");
        printf("   http://192.168.4.1\n");
        printf("\n");
        printf("3. Control motor from web interface\n");
        printf("========================================\n\n");
    }

    printf("\n");
    printf("Motor Control System Ready!\n");
    printf("Type 'H' for help, '?' for status\n");
    printf("\n> ");
    fflush(stdout);

    // Main command processing loop
    uint8_t data[1];
    while (1) {
        // Read one character from UART
        int len = uart_read_bytes(UART_PORT_NUM, data, 1, pdMS_TO_TICKS(100));

        if (len > 0) {
            char cmd = (char)data[0];

            // Echo character (except newlines)
            if (cmd != '\r' && cmd != '\n') {
                printf("%c\n", cmd);
            }

            // Process command
            process_command(cmd);

            // Print prompt
            if (cmd != '?' && cmd != 'H' && cmd != 'h') {
                printf("> ");
                fflush(stdout);
            } else {
                printf("> ");
                fflush(stdout);
            }
        }
    }
}
