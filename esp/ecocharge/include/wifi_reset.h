#ifndef WIFI_RESET_H
#define WIFI_RESET_H

#include <stdbool.h>

#include "esp_err.h"

/**
 * WiFi reset button — hardware rev 3.0.0 (2026-08-20).
 *
 * A momentary push-button wired between WIFI_RESET_BTN_GPIO and GND. Holding
 * it for WIFI_RESET_HOLD_MS erases the saved WiFi credentials from NVS and
 * reboots the kiosk straight into its provisioning access point.
 *
 * Why this exists: before rev 3 the ONLY way to move a kiosk onto a different
 * network was to physically retrieve it and reflash it, because the
 * provisioning AP is only reachable when the stored credentials FAIL. A kiosk
 * holding valid credentials for a network that had simply been renamed, or
 * whose password had rotated, was unreachable and un-reconfigurable in the
 * field. This button is the physical escape hatch.
 *
 * Deliberately a long hold, not a tap: a stray knock or a bounced contact must
 * never be able to take a working kiosk off the network.
 */

/** Start the button-watch task. Safe to call before or after WiFi is up. */
esp_err_t wifi_reset_button_init(void);

/**
 * True while the button is physically held down.
 * Exposed so the self-test can report the button's wiring without requiring
 * anyone to hold it for the full trigger duration.
 */
bool wifi_reset_button_is_pressed(void);

#endif // WIFI_RESET_H
