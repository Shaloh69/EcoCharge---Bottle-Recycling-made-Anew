#include "bottle_fsm.h"
#include "config.h"
#include "ultrasonic.h"
#include "conveyor_motor.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"

// ============================================================================
// EcoCharge — Bottle Handling State Machine
//
// This task runs independently of the command poll task.
// Sensor readings come from ultrasonic_get() which is updated by the
// sensor task every SENSOR_SAMPLE_MS.
//
// The kiosk web app controls the scan loop (takes photos, calls AI).
// The FSM only controls the mechanical side:
//   • Starts conveyor slow when bottle arrives
//   • Auto-nudges on BOTTLE_SCAN_INTERVAL_MS so the camera gets new angles








//   • On approve → ramps to fast speed → drops bottle → waits for bin confirm
//   • On reject  → reverses until entrance clears → returns to idle
// ============================================================================

static volatile bottle_fsm_state_t s_state        = BOTTLE_FSM_IDLE;
static volatile bool               s_approve_req   = false;
static volatile bool               s_reject_req    = false;
static volatile bool               s_bin_confirmed = false;

static SemaphoreHandle_t s_mutex = NULL;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
static void _set_state(bottle_fsm_state_t next)
{
    s_state = next;
    ESP_LOGI(LOG_TAG, "Bottle FSM → %s", bottle_fsm_state_str());
}

static void _enter_idle(void)
{
    conveyor_stop();
    s_approve_req   = false;
    s_reject_req    = false;
    _set_state(BOTTLE_FSM_IDLE);
}

// ---------------------------------------------------------------------------
// FSM task
// ---------------------------------------------------------------------------
static void _bottle_fsm_task(void *arg)
{
    ESP_LOGI(LOG_TAG, "Bottle FSM task started");

    TickType_t scan_last_nudge   = 0;
    TickType_t drop_start_tick   = 0;
    TickType_t reject_start_tick = 0;

    while (1) {
        switch (s_state) {

        // ----------------------------------------------------------------
        case BOTTLE_FSM_IDLE:
            if (ultrasonic_bottle_at_entrance()) {
                ESP_LOGI(LOG_TAG, "Bottle detected at entrance — starting scan");
                s_bin_confirmed = false;
                conveyor_set_speed(CONVEYOR_SPEED_SCAN);
                conveyor_forward();
                scan_last_nudge = xTaskGetTickCount();
                _set_state(BOTTLE_FSM_SCANNING);
            }
            break;

        // ----------------------------------------------------------------
        case BOTTLE_FSM_SCANNING:
            // Check for backend commands first
            if (s_approve_req) {
                s_approve_req = false;
                ESP_LOGI(LOG_TAG, "Bottle approved — dropping into bin");
                conveyor_set_speed(CONVEYOR_SPEED_FAST);
                conveyor_forward();
                drop_start_tick = xTaskGetTickCount();
                _set_state(BOTTLE_FSM_DROPPING);
                break;
            }
            if (s_reject_req) {
                s_reject_req = false;
                ESP_LOGI(LOG_TAG, "Bottle rejected — reversing out");
                conveyor_set_speed(CONVEYOR_SPEED_REVERSE);
                conveyor_reverse();
                reject_start_tick = xTaskGetTickCount();
                _set_state(BOTTLE_FSM_REJECTING);
                break;
            }

            // Auto-nudge pattern: forward BOTTLE_NUDGE_FORWARD_MS,
            // pause BOTTLE_NUDGE_PAUSE_MS, repeat every BOTTLE_SCAN_INTERVAL_MS.
            // The kiosk camera takes a photo during the pause window.
            {
                TickType_t now = xTaskGetTickCount();
                uint32_t elapsed_ms = pdTICKS_TO_MS(now - scan_last_nudge);

                if (elapsed_ms >= BOTTLE_SCAN_INTERVAL_MS) {
                    // Nudge forward
                    conveyor_set_speed(CONVEYOR_SPEED_SCAN);
                    conveyor_forward();
                    vTaskDelay(pdMS_TO_TICKS(BOTTLE_NUDGE_FORWARD_MS));
                    conveyor_stop();
                    scan_last_nudge = xTaskGetTickCount();
                    ESP_LOGD(LOG_TAG, "Nudge complete — awaiting scan attempt");
                }
            }
            break;

        // ----------------------------------------------------------------
        case BOTTLE_FSM_DROPPING:
            // Wait until bin sensor detects the bottle
            if (ultrasonic_bottle_in_bin()) {
                conveyor_stop();
                s_bin_confirmed = true;
                ESP_LOGI(LOG_TAG, "Bottle confirmed in bin");
                _set_state(BOTTLE_FSM_CONFIRMING);
                break;
            }
            // Timeout — bottle didn't reach bin within expected time
            {
                TickType_t now = xTaskGetTickCount();
                if (pdTICKS_TO_MS(now - drop_start_tick) >= BOTTLE_BIN_TIMEOUT_MS) {
                    ESP_LOGW(LOG_TAG, "Bin confirmation timeout — no bottle detected");
                    s_bin_confirmed = false;
                    conveyor_stop();
                    _set_state(BOTTLE_FSM_CONFIRMING); // still report, let backend decide
                }
            }
            break;

        // ----------------------------------------------------------------
        case BOTTLE_FSM_CONFIRMING:
            // Telemetry task will report bottle_in_bin=s_bin_confirmed.
            // After one telemetry cycle, return to idle.
            // Give telemetry task ~TELEMETRY_POST_MS + margin to pick it up.
            vTaskDelay(pdMS_TO_TICKS(TELEMETRY_POST_MS + 500));
            _enter_idle();
            break;

        // ----------------------------------------------------------------
        case BOTTLE_FSM_REJECTING:
            // Run in reverse until entrance clears or 10 s safety timeout
            if (!ultrasonic_bottle_at_entrance()) {
                ESP_LOGI(LOG_TAG, "Bottle ejected — returning to idle");
                _enter_idle();
            } else if (pdTICKS_TO_MS(xTaskGetTickCount() - reject_start_tick) >= 10000) {
                ESP_LOGW(LOG_TAG, "Reject timeout — forcing idle (sensor stuck?)");
                _enter_idle();
            }
            break;

        } // switch

        vTaskDelay(pdMS_TO_TICKS(100)); // 10 Hz FSM tick
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
void bottle_fsm_start(void)
{
    s_mutex = xSemaphoreCreateMutex();
    _enter_idle();
    xTaskCreate(_bottle_fsm_task, "bottle_fsm",
                BOTTLE_FSM_TASK_STACK, NULL,
                BOTTLE_FSM_TASK_PRIORITY, NULL);
}

void bottle_fsm_approve(void)
{
    s_approve_req = true;
}

void bottle_fsm_reject(void)
{
    s_reject_req = true;
}

bottle_fsm_state_t bottle_fsm_get_state(void)
{
    return s_state;
}

const char *bottle_fsm_state_str(void)
{
    switch (s_state) {
    case BOTTLE_FSM_IDLE:        return "idle";
    case BOTTLE_FSM_SCANNING:    return "scanning";
    case BOTTLE_FSM_DROPPING:    return "dropping";
    case BOTTLE_FSM_CONFIRMING:  return "confirming";
    case BOTTLE_FSM_REJECTING:   return "rejecting";
    default:                     return "unknown";
    }
}

bool bottle_fsm_bin_confirmed(void)
{
    return s_bin_confirmed;
}
