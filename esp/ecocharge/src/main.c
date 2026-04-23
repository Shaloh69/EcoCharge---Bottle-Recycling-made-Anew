#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "nvs_flash.h"

#include "esp_netif.h"
#include "esp_event.h"
#include "esp_wifi.h"
#include "config.h"
#include "nvs_config.h"
#include "conveyor_motor.h"
#include "relay_control.h"
#include "sensor_monitor.h"
#include "ultrasonic.h"
#include "bottle_fsm.h"
#include "api_client.h"
#include "wifi_sta.h"
#include "wifi_ap.h"
#include "wifi_provision.h"
#include "web_server.h"
#include "self_test.h"

// ============================================================================
// EcoCharge Kiosk Controller — Main Application
//
// Boot sequence
// ─────────────
//  1. NVS + peripherals initialised
//  2. Safety task started (LED + relay timeouts)
//  3. Check NVS for WiFi credentials
//
//  a) Credentials present  → sensor_task + bottle_fsm started immediately
//                            STA WiFi connect → command_poll + telemetry tasks
//                            LED: FAST (connecting) → DOUBLE (ready)
//                                              or SLOW (WiFi failed)
//
//  b) No credentials       → self-test runs first (LED SOLID while testing)
//                            LED FIVE for 5 s if any critical failure
//                            sensor_task + bottle_fsm started after test
//                            AP + captive-portal DNS + web server on /provision
//                            LED TRIPLE (provisioning mode)
//
// LED blink patterns (safety_task, 100 ms frame clock):
//   FAST   ·· ·· ··          200 ms cycle — booting / WiFi connecting
//   SLOW   ─────·····        1000 ms cycle — WiFi failed / offline
//   DOUBLE ·· ────────       1000 ms cycle — WiFi connected, ready ✓
//   TRIPLE ··· ─────────     1200 ms cycle — provisioning AP mode active
//   FIVE   ····· ─────────── 2000 ms cycle — self-test critical failure
//   SOLID  ──────────────    always on — self-test in progress
// ============================================================================

// ============================================================================
// LED mode definitions
// ============================================================================

typedef enum {
    LED_MODE_OFF    = 0,  // always off
    LED_MODE_SOLID  = 1,  // always on (self-test in progress)
    LED_MODE_FAST   = 2,  // ·· ·· ——  200 ms cycle: booting / WiFi connecting
    LED_MODE_SLOW   = 3,  // ─────····  1000 ms cycle: WiFi failed / server unreachable
    LED_MODE_DOUBLE = 4,  // ·· ──────  1000 ms cycle: WiFi connected, waiting server
    LED_MODE_TRIPLE = 5,  // ··· ─────  1200 ms cycle: provisioning AP mode
    LED_MODE_FIVE   = 6,  // ····· ────  2000 ms cycle: self-test critical failure
    LED_MODE_SERVER = 7,  // ··· ──────  1800 ms cycle: server connected + heartbeat OK
} led_mode_t;

// Frame pattern arrays — each element = 100 ms, 1=ON, 0=OFF
static const uint8_t PAT_FAST[]   = {1, 0};
static const uint8_t PAT_SLOW[]   = {1, 1, 1, 1, 1, 0, 0, 0, 0, 0};
static const uint8_t PAT_DOUBLE[] = {1, 0, 1, 0, 0, 0, 0, 0, 0, 0};
static const uint8_t PAT_TRIPLE[] = {1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0};
static const uint8_t PAT_FIVE[]   = {1, 0, 1, 0, 1, 0, 1, 0, 1, 0,
                                      0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
// SERVER: 3 quick blinks then a long 1.2 s pause — calm and stable
static const uint8_t PAT_SERVER[] = {1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

typedef struct { const uint8_t *frames; int len; } led_pat_t;

static const led_pat_t s_patterns[] = {
    [LED_MODE_FAST]   = { PAT_FAST,   2  },
    [LED_MODE_SLOW]   = { PAT_SLOW,   10 },
    [LED_MODE_DOUBLE] = { PAT_DOUBLE, 10 },
    [LED_MODE_TRIPLE] = { PAT_TRIPLE, 12 },
    [LED_MODE_FIVE]   = { PAT_FIVE,   20 },
    [LED_MODE_SERVER] = { PAT_SERVER, 18 },
};

static volatile led_mode_t s_led_mode = LED_MODE_FAST;

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
// Safety task — enforces relay timeouts and drives the status LED
// ---------------------------------------------------------------------------
static void safety_task(void *arg)
{
    ESP_LOGI(LOG_TAG, "Safety task started");

    int        pat_idx   = 0;
    led_mode_t last_mode = (led_mode_t)(-1);

    while (1) {
        relay_check_timeouts();

        // ── LED state machine ──────────────────────────────────────────────
        led_mode_t mode = s_led_mode;

        // Reset pattern index when mode changes
        if (mode != last_mode) {
            pat_idx   = 0;
            last_mode = mode;
        }

        if (mode == LED_MODE_OFF) {
            gpio_set_level(STATUS_LED_PIN, 0);
        } else if (mode == LED_MODE_SOLID) {
            gpio_set_level(STATUS_LED_PIN, 1);
        } else {
            // Pattern-based modes
            const led_pat_t *pat = &s_patterns[mode];
            gpio_set_level(STATUS_LED_PIN, pat->frames[pat_idx]);
            pat_idx = (pat_idx + 1) % pat->len;
        }
        // ──────────────────────────────────────────────────────────────────

        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

// ---------------------------------------------------------------------------
// Sensor sampling task — ADC charging sensors + ultrasonic sensors
// ---------------------------------------------------------------------------
static void sensor_task(void *arg)
{
    ESP_LOGI(LOG_TAG, "Sensor task started");
    while (1) {
        sensor_sample_all();
        ultrasonic_read_all();
        vTaskDelay(pdMS_TO_TICKS(SENSOR_SAMPLE_MS));
    }
}

// ---------------------------------------------------------------------------
// Command polling task — also acts as server heartbeat.
// On 200 OK  → LED_MODE_SERVER (3 blinks, long pause) = server alive
// On failure → LED_MODE_SLOW   (slow blink)           = server unreachable
// WiFi lost  → LED_MODE_FAST   (fast blink)           = reconnecting
// ---------------------------------------------------------------------------
static void command_poll_task(void *arg)
{
    ESP_LOGI(LOG_TAG, "Command poll task started");
    while (1) {
        if (wifi_sta_is_connected()) {
            esp_err_t ret = api_client_poll_commands();
            if (ret == ESP_OK) {
                s_led_mode = LED_MODE_SERVER;
            } else {
                ESP_LOGW(LOG_TAG, "Server unreachable (%s) — retrying in %d ms",
                         esp_err_to_name(ret), COMMAND_POLL_MS);
                s_led_mode = LED_MODE_SLOW;
            }
        } else {
            s_led_mode = LED_MODE_FAST;
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
    printf("  ESP32 — 4-Port Charging + Bottle FSM\n");
    printf("  Backend: %s\n", RENDER_BASE_URL);
    printf("=================================================\n\n");

    // ── NVS flash init ───────────────────────────────────────────────────────
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    nvs_config_init();

    // ── Network stack — init exactly once, before any WiFi module ───────────
    // Both netifs are created upfront so wifi_sta and wifi_ap can simply
    // switch modes on the already-initialised driver without deinit/reinit.
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();
    esp_netif_create_default_wifi_ap();
    {
        wifi_init_config_t wifi_init_cfg = WIFI_INIT_CONFIG_DEFAULT();
        ESP_ERROR_CHECK(esp_wifi_init(&wifi_init_cfg));
    }

    // ── Peripherals ──────────────────────────────────────────────────────────
    led_init();
    s_led_mode = LED_MODE_FAST;  // fast blink = booting

    ESP_LOGI(LOG_TAG, "Initializing peripherals...");
    ESP_ERROR_CHECK(conveyor_init());
    ESP_ERROR_CHECK(relay_init());
    ESP_ERROR_CHECK(sensor_init());
    ESP_ERROR_CHECK(ultrasonic_init());

    // Safety task drives LED + relay watchdog from this point forward
    xTaskCreate(safety_task, "safety", SAFETY_TASK_STACK, NULL,
                SAFETY_TASK_PRIORITY, NULL);

    // ── Boot mode decision ───────────────────────────────────────────────────
    if (nvs_config_has_wifi_creds()) {
        // ====================================================================
        // NORMAL MODE — STA WiFi + Render server polling
        // ====================================================================
        ESP_LOGI(LOG_TAG, "WiFi credentials found — normal mode");

        // Start background tasks immediately in normal mode
        bottle_fsm_start();
        xTaskCreate(sensor_task, "sensor", SENSOR_TASK_STACK, NULL,
                    SENSOR_TASK_PRIORITY, NULL);

        s_led_mode = LED_MODE_FAST;  // fast blink = connecting
        ret = wifi_sta_connect();

        if (ret != ESP_OK) {
            ESP_LOGE(LOG_TAG, "WiFi failed — falling back to AP provisioning mode");
            s_led_mode = LED_MODE_TRIPLE;  // ··· = provisioning AP active
            relay_disable_all();

            // Start AP so the user can reach the portal to reconfigure WiFi
            ESP_ERROR_CHECK(wifi_ap_init());
            ESP_ERROR_CHECK(wifi_provision_start());
            ESP_ERROR_CHECK(web_server_start());

            printf("\nWiFi connection failed — provisioning mode active.\n");
            printf("  Connect to WiFi:  %s\n", WIFI_AP_SSID);
            printf("  Password:         %s\n", WIFI_AP_PASSWORD);
            printf("  Setup page:       http://%s/provision\n\n", AP_IP_ADDR);
        } else {
            ESP_LOGI(LOG_TAG, "WiFi connected — starting API tasks");
            // LED stays FAST until command_poll_task confirms server on first heartbeat

            api_client_init();
            xTaskCreate(command_poll_task, "cmd_poll",  COMMAND_TASK_STACK,
                        NULL, COMMAND_TASK_PRIORITY,   NULL);
            xTaskCreate(telemetry_task,    "telemetry", TELEMETRY_TASK_STACK,
                        NULL, TELEMETRY_TASK_PRIORITY, NULL);

            web_server_start();
            printf("\nEcoCharge controller ready.\n");
            printf("Backend: %s\n", RENDER_BASE_URL);
            printf("Kiosk ID: %d\n\n", KIOSK_ID);
        }

    } else {
        // ====================================================================
        // PROVISIONING MODE — self-test → AP + captive portal
        //
        // sensor_task and bottle_fsm are NOT started before the self-test
        // to avoid concurrent UART reads and motor commands during the test.
        // ====================================================================
        ESP_LOGI(LOG_TAG, "No WiFi credentials — running hardware self-test");

        s_led_mode = LED_MODE_SOLID;  // solid on = self-test in progress

        selftest_results_t st;
        esp_err_t st_ret = self_test_run(&st);

        if (st_ret != ESP_OK) {
            // 5-blink alert for 5 seconds, then continue booting anyway
            ESP_LOGE(LOG_TAG, "%d critical failure(s) — continuing boot in 5 s", st.fail_count);
            s_led_mode = LED_MODE_FIVE;
            vTaskDelay(pdMS_TO_TICKS(5000));
        } else {
            ESP_LOGI(LOG_TAG, "Self-test passed — continuing to provisioning");
        }

        // Start background tasks after self-test completes
        bottle_fsm_start();
        xTaskCreate(sensor_task, "sensor", SENSOR_TASK_STACK, NULL,
                    SENSOR_TASK_PRIORITY, NULL);

        // ··· triple-blink = provisioning AP mode active
        s_led_mode = LED_MODE_TRIPLE;

        ESP_LOGI(LOG_TAG, "Starting provisioning mode (AP + captive portal)");
        ESP_ERROR_CHECK(wifi_ap_init());
        ESP_ERROR_CHECK(wifi_provision_start());
        ESP_ERROR_CHECK(web_server_start());

        printf("\nProvisioning mode active.\n");
        printf("  Connect to WiFi:  %s\n",         WIFI_AP_SSID);
        printf("  Password:         %s\n",         WIFI_AP_PASSWORD);
        printf("  Setup page:       http://%s/provision\n",   AP_IP_ADDR);
        printf("  Self-test results:http://%s/api/selftest\n\n", AP_IP_ADDR);
    }

    // Keep FreeRTOS scheduler alive
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(10000));
    }
}
