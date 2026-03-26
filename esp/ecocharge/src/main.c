#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "nvs_flash.h"

#include "config.h"
#include "nvs_config.h"
#include "conveyor_motor.h"
#include "relay_control.h"
#include "sensor_monitor.h"
#include "api_client.h"
#include "wifi_sta.h"
#include "wifi_ap.h"
#include "wifi_provision.h"
#include "web_server.h"

// ============================================================================
// EcoCharge Kiosk Controller — Main Application
//
// Boot sequence
// ─────────────
//  1. NVS + peripherals initialised (always)
//  2. Safety + sensor FreeRTOS tasks started (always — needed for test page)
//  3. Check NVS for WiFi credentials
//     a) Credentials present  → STA mode → normal operation (command poll +
//                                telemetry tasks) + web server on 192.168.4.1
//     b) No credentials       → AP + captive-portal DNS → web server serves
//                                /provision; user saves creds → reboot
// ============================================================================

static int s_led_blink_ms = LED_BLINK_INIT;

// ---------------------------------------------------------------------------
// LED helper
// ---------------------------------------------------------------------------
static void led_init(void)
{
    gpio_config_t cfg = {
        .pin_bit_mask = (1ULL << STATUS_LED_PIN),
        .mode         = GPIO_MODE_OUTPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    gpio_config(&cfg);
    gpio_set_level(STATUS_LED_PIN, 0);
}

// ---------------------------------------------------------------------------
// Safety task — enforces relay timeouts and overcurrent shutoff
// ---------------------------------------------------------------------------
static void safety_task(void *arg)
{
    ESP_LOGI(LOG_TAG, "Safety task started");
    TickType_t last_blink = 0;
    int led_state = 0;

    while (1) {
        relay_check_timeouts();

        // Status LED
        TickType_t now = xTaskGetTickCount();
        if (s_led_blink_ms > 0 &&
            pdTICKS_TO_MS(now - last_blink) >= (uint32_t)s_led_blink_ms) {
            led_state = !led_state;
            gpio_set_level(STATUS_LED_PIN, led_state);
            last_blink = now;
        } else if (s_led_blink_ms == LED_SOLID_ON) {
            gpio_set_level(STATUS_LED_PIN, 1);
        } else if (s_led_blink_ms == LED_OFF) {
            gpio_set_level(STATUS_LED_PIN, 0);
        }

        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

// ---------------------------------------------------------------------------
// Sensor sampling task
// ---------------------------------------------------------------------------
static void sensor_task(void *arg)
{
    ESP_LOGI(LOG_TAG, "Sensor task started");
    while (1) {
        sensor_sample_all();
        vTaskDelay(pdMS_TO_TICKS(SENSOR_SAMPLE_MS));
    }
}

// ---------------------------------------------------------------------------
// Command polling task (normal mode only)
// ---------------------------------------------------------------------------
static void command_poll_task(void *arg)
{
    ESP_LOGI(LOG_TAG, "Command poll task started");
    while (1) {
        if (wifi_sta_is_connected()) {
            esp_err_t ret = api_client_poll_commands();
            if (ret != ESP_OK) {
                ESP_LOGW(LOG_TAG, "Poll failed: %s", esp_err_to_name(ret));
            }
        }
        vTaskDelay(pdMS_TO_TICKS(COMMAND_POLL_MS));
    }
}

// ---------------------------------------------------------------------------
// Telemetry post task (normal mode only)
// ---------------------------------------------------------------------------
static void telemetry_task(void *arg)
{
    ESP_LOGI(LOG_TAG, "Telemetry task started");
    while (1) {
        if (wifi_sta_is_connected()) {
            api_client_post_telemetry();
        }
        vTaskDelay(pdMS_TO_TICKS(TELEMETRY_POST_MS));
    }
}

// ---------------------------------------------------------------------------
// app_main
// ---------------------------------------------------------------------------
void app_main(void)
{
    printf("\n\n");
    printf("=================================================\n");
    printf("  EcoCharge Kiosk Controller v%s\n", FIRMWARE_VERSION);
    printf("  ESP32 — Servo + 4-Port Charging Controller\n");
    printf("=================================================\n\n");

    // ---- NVS flash init ----
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    nvs_config_init();

    // ---- GPIO / peripherals ----
    led_init();
    s_led_blink_ms = LED_BLINK_INIT;

    ESP_LOGI(LOG_TAG, "Initializing peripherals...");
    ESP_ERROR_CHECK(conveyor_init());
    ESP_ERROR_CHECK(relay_init());
    ESP_ERROR_CHECK(sensor_init());

    // Safety + sensor tasks run in both modes (needed for hardware test page)
    xTaskCreate(safety_task, "safety", SAFETY_TASK_STACK, NULL,
                SAFETY_TASK_PRIORITY, NULL);
    xTaskCreate(sensor_task, "sensor", SENSOR_TASK_STACK, NULL,
                SENSOR_TASK_PRIORITY, NULL);

    // ---- Boot mode decision ----
    if (nvs_config_has_wifi_creds()) {
        // ================================================================
        // NORMAL MODE — STA WiFi + Render polling
        // ================================================================
        ESP_LOGI(LOG_TAG, "WiFi credentials found in NVS — starting in normal mode");

        ret = wifi_sta_connect();
        if (ret != ESP_OK) {
            ESP_LOGE(LOG_TAG, "WiFi failed — offline mode (relays disabled)");
            s_led_blink_ms = LED_BLINK_ERROR;
            relay_disable_all();
        } else {
            s_led_blink_ms = LED_SOLID_ON;
            ESP_LOGI(LOG_TAG, "WiFi connected — starting API tasks");

            api_client_init();
            xTaskCreate(command_poll_task, "cmd_poll",  COMMAND_TASK_STACK,
                        NULL, COMMAND_TASK_PRIORITY,   NULL);
            xTaskCreate(telemetry_task,    "telemetry", TELEMETRY_TASK_STACK,
                        NULL, TELEMETRY_TASK_PRIORITY, NULL);
        }

        // Web server accessible at kiosk IP for hardware testing
        web_server_start();
        printf("\nEcoCharge controller ready.\n");
        printf("Polling: %s/api/devices/commands?kiosk_id=%d\n\n",
               RENDER_BASE_URL, KIOSK_ID);

    } else {
        // ================================================================
        // PROVISIONING MODE — AP + captive portal
        // ================================================================
        ESP_LOGI(LOG_TAG, "No WiFi credentials — starting provisioning mode");

        ESP_ERROR_CHECK(wifi_ap_init());
        ESP_ERROR_CHECK(wifi_provision_start());
        ESP_ERROR_CHECK(web_server_start());

        s_led_blink_ms = LED_BLINK_ERROR; // slow blink = provisioning mode

        printf("\nProvisioning mode active.\n");
        printf("Connect phone to: %s\n", WIFI_AP_SSID);
        printf("Password:         %s\n", WIFI_AP_PASSWORD);
        printf("Open browser:     http://%s/provision\n\n", AP_IP_ADDR);
    }

    // Keep FreeRTOS scheduler alive
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(10000));
    }
}
