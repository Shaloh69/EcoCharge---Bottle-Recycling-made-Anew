#ifndef BOTTLE_FSM_H
#define BOTTLE_FSM_H

// ============================================================================
// EcoCharge — Bottle Handling State Machine
//
// States:
//   IDLE        — No bottle. Conveyor stopped. Watching entrance sensor.
//   SCANNING    — Bottle detected. Conveyor slow. Auto-nudging every
//                 BOTTLE_SCAN_INTERVAL_MS so the kiosk camera gets fresh angles.
//                 Kiosk sends approve_bottle or reject_bottle command.
//   DROPPING    — AI approved. Conveyor fast-forward. Watching bin sensors.
//   CONFIRMING  — Conveyor stopped at bin. Waiting for bin sensor within
//                 BOTTLE_BIN_TIMEOUT_MS. Reports bottle_in_bin via telemetry.
//   REJECTING   — AI rejected. Conveyor reverse at medium speed until the
//                 entrance sensor clears (bottle exits). Then back to IDLE.
// ============================================================================

#include <stdbool.h>

typedef enum {
    BOTTLE_FSM_IDLE = 0,
    BOTTLE_FSM_SCANNING,
    BOTTLE_FSM_DROPPING,
    BOTTLE_FSM_CONFIRMING,
    BOTTLE_FSM_REJECTING,
} bottle_fsm_state_t;

/**
 * @brief Start the bottle FSM FreeRTOS task.
 *        Call once from app_main after ultrasonic_init().
 */
void bottle_fsm_start(void);

/**
 * @brief Called by api_client when an approve_bottle command arrives.
 */
void bottle_fsm_approve(void);

/**
 * @brief Called by api_client when a reject_bottle command arrives.
 */
void bottle_fsm_reject(void);

/**
 * @brief Return the current FSM state (for telemetry reporting).
 */
bottle_fsm_state_t bottle_fsm_get_state(void);

/**
 * @brief Return human-readable state string for telemetry JSON.
 */
const char *bottle_fsm_state_str(void);

/**
 * @brief Return true if a bin confirmation has been received since the
 *        last IDLE transition. Cleared automatically on next IDLE entry.
 */
bool bottle_fsm_bin_confirmed(void);

/**
 * @brief Return true if SCANNING hit BOTTLE_SCAN_TIMEOUT_MS without an
 *        approve/reject command (browser crash, AI down, no active
 *        session). Stays true through the IDLE period that follows (so
 *        telemetry has time to report it) — cleared when the next scan
 *        actually starts, same convention as bottle_fsm_bin_confirmed().
 */
bool bottle_fsm_scan_timed_out(void);

#endif // BOTTLE_FSM_H
