# EcoCharge ESP32 Kiosk Controller

**Rewritten 2026-08-10 — the previous version of this README described an older firmware revision** (a servo-based conveyor gate, ACS712 + ADS1115 I2C sensing, no ultrasonic sensors, no bottle FSM, no Raspberry Pi Pico bridge). That's not what's actually running. This version is corrected against `../../docs/planning/09-system-analysis.md` §11, verified directly from the real v2.0.0 source in `src/`/`include/` — if this ever drifts from the code again, treat the code and `../../docs/planning/09-system-analysis.md` as authoritative, not this file.

This folder contains the ESP-IDF firmware for the EcoCharge kiosk hardware controller. It runs on an ESP32 dev board (PlatformIO, `framework = espidf`, target `esp32dev`, huge_app partition) and manages every physical subsystem: the bottle conveyor, four charging-port relays, three ultrasonic sensors, and per-port current/voltage sensing (ports 1-2 locally; ports 3-4 via a companion **second ESP32** — see `../esp32_sensor`). **Hardware rev 3.0.0 (2026-08-20) replaced the previous Raspberry Pi Pico co-processor with that second ESP32**, which put all eight analog channels on a WiFi-safe ADC1 and restored port 4's overcurrent protection; reasoning in `../../docs/evidence/hardware-wiring-diagram.md`.

## Role in the system

```
API Server  ←—— HTTPS poll (2s) / telemetry POST (5s) ——→  ESP32 (WiFi STA)
                                                                  |
                                                                  +-- Conveyor (L298N H-bridge) — forward/reverse/fast-forward
                                                                  +-- 4x Relay (charging ports) — active-low, GPIO 25/26/16/5
                                                                  +-- 3x HC-SR04 ultrasonic — entrance, bin-top, bin-bottom
                                                                  +-- Current/voltage sensing (ADC1 ports 1-2 + UART from ESP32-B for
                                                                      the channels the ESP32's own ADC can't cover while WiFi is up)
```

The ESP32 executes; it does not decide. It polls `GET /api/devices/commands` every 2 seconds, executes whatever arrives, posts telemetry every 5 seconds, and pings `/health` every 4 minutes (keeps a free-tier Render instance awake — irrelevant once the self-hosting migration lands). **It never receives inbound connections** — this is deliberate, so it works behind NAT/CGNAT with no port forwarding.

## The bottle-deposit FSM

`src/bottle_fsm.c` runs `IDLE → SCANNING → DROPPING → CONFIRMING → (IDLE)`, with a `REJECTING` branch. The entrance ultrasonic sensor triggers entry into `SCANNING`; the conveyor nudges the bottle every 2s (`BOTTLE_SCAN_INTERVAL_MS`) for fresh camera angles while the kiosk web app runs AI detection. On accept, `DROPPING` fast-forwards the bottle into the bin (8s cap); `CONFIRMING` waits on the bin ultrasonic sensor to independently confirm the drop.

**Two known gaps, not yet fixed, exact proposed values in `../../docs/planning/11-audit-findings.md`:** `SCANNING` currently has no timeout at all (can nudge indefinitely under specific failure conditions), and `CONFIRMING` doesn't re-sample the bin sensor before finalizing a reject on the `DROPPING` timeout. Both are firmware-level fixes awaiting explicit sign-off before flashing — see `../../docs/planning/03-revamp-master.md` §3.2–§3.3. **A third, separate issue** (bottles not reliably detected while in motion on the conveyor, a capture-timing problem on the kiosk-web side rather than firmware) is diagnosed in `../../docs/planning/07-ai-detection-improvements.md`.

## Boot modes

On every boot, the firmware checks NVS flash for saved WiFi credentials.

### Normal mode (credentials saved)
Connects to WiFi → polls the API server for commands → posts telemetry. The local test dashboard is reachable at `http://<kiosk-IP>/test` while on the same network.

### Provisioning mode (no credentials yet)
Starts a WiFi access point (`EcoCharge_Config`) with a captive-portal DNS server. Connect a phone → browser auto-opens → navigate to `/provision` → enter WiFi SSID/password → save → ESP32 reboots into Normal mode. Includes real WiFi-scan + signal-strength UI on the provisioning page.

A hardware **self-test** (`self_test.c`) exercises the ESP32-B sensor-node UART link, the conveyor motor, and the sensors at boot — extend this (not build a parallel mechanism) if a remote self-test-from-the-admin-console feature is ever added, per the pattern established on sibling projects.

## Local test dashboard (`/test`)

Connect to `http://<kiosk-IP>/test` from any browser on the same network. Real endpoints, not a mockup: `/` (status), `/api/status`, `/api/sse` (live sensor stream), conveyor forward/reverse/stop/speed controls, relay on/off/all-off, `/api/wifi/scan`, `/api/selftest`, `/api/reboot`.

## Hardware map (verified against `include/config.h`, 2026-08-10)

### Conveyor (L298N H-bridge)

| Signal | GPIO | Notes |
|---|---|---|
| IN1 | 19 | Direction pin 1 |
| IN2 | 23 | Direction pin 2 |
| ENA | 18 | LEDC PWM 1kHz — speed control |

### Charging-port relays (4x, active-low)

GPIO 25 / 26 / 16 / 5 — one per port. Independent 3600s max-on watchdog task runs regardless of server commands (verified fail-safe: `relay_control.c:43` drives every relay to OFF at boot, before any task starts — a reboot mid-session cannot leave a port energized with nothing tracking it).

### Ultrasonic sensors (HC-SR04 ×3)

| Sensor | GPIOs | Threshold |
|---|---|---|
| Entrance | 13 / **34** | < 15cm triggers `SCANNING`. ECHO moved off GPIO36 in rev 4.0.0 — **that pin does not exist on the boards in use**; 34 is also input-only |
| Bin-top | 14 / **35** | 20cm. ECHO moved off GPIO39, same reason |
| Bin-bottom | **25 / 26** | 20cm |

5V → 3.3V voltage dividers on each ECHO line.

### Power sensing

| Channel | Source | Notes |
|---|---|---|
| **All four ports, current and voltage** | **ESP32-B**, over UART2 (RX=17, TX=4, 115200 baud) | **Rev 4.0.0:** this board reads no analog at all. B streams `T,v1,i1,...,v4,i4,relaymask,ocmask` every 100 ms. Only B can host all eight channels: ADC1 has four usable channels here (GPIO36-39 don't exist on these boards) and ADC2 is dead while WiFi is on — B never starts its radio. See `../esp32_sensor` |
| **Relays** | **ESP32-B** | **Rev 4.0.0:** moved so the overcurrent trip sits on the same board as the relays it cuts. `relay_control.c` keeps its exact API and sends `R,<port>,<0\|1>` over UART instead of toggling a GPIO |
| ~~SW4 current on ADC2 / GPIO12~~ | **removed in rev 3.0.0** | ADC2 is unusable while WiFi is active, so this channel read a permanent 0.00 A and port 4 had **no working overcurrent protection**. GPIO12 is also the MTDI strapping pin. Both problems are gone — nothing uses ADC2 now |

### WiFi reset button (new in rev 3.0.0)

| Pin | Wiring | Behaviour |
|---|---|---|
| GPIO 22 | `GPIO22 —— [momentary button] —— GND` (internal pull-up; no external resistor) | **Hold 3 s** → erase stored WiFi credentials from NVS → reboot into the provisioning AP. A tap does nothing. Held at power-on it is ignored until released once, so a stuck button cannot wipe credentials on every boot. |

GPIO22 is used because it is the only free pin on this board that is **not** a strapping pin — a button on GPIO0/2/12/15 held during power-on could prevent the board booting. Implementation: `src/wifi_reset.c`. Full circuit and rationale: `../../docs/evidence/hardware-wiring-diagram.md`.

### Other

Status LED on GPIO 27, distinct blink pattern per FSM/connection state.

## FreeRTOS tasks (priority)

Safety/watchdog (10) · command poll (7) · bottle FSM (6) · httpd (5) · sensors (4) · telemetry (3).

## Configuration

Before flashing, set the server/device identity in `include/config.h`:

```c
#define RENDER_BASE_URL   "https://your-api-host"      // becomes the self-hosted API's URL post-migration
#define DEVICE_API_KEY    "your-device-secret"          // must match the kiosk's record in the database
#define KIOSK_ID          1
#define AI_SERVER_URL     "https://your-ai-host"
#define AI_API_KEY        "your-ai-secret"
```

**These are currently compile-time constants, and are treated as compromised since they're committed in git history** — key rotation (moving device/AI keys into NVS via the provisioning portal, the same pattern already used for WiFi credentials) is planned but not yet done. See `../../docs/planning/11-audit-findings.md` and `../../docs/planning/03-revamp-master.md` §2 item 3 before reflashing with new keys — this needs to happen as one coordinated change, not piecemeal.

WiFi credentials are entered at runtime via the provisioning page and stored in NVS — `WIFI_SSID_DEFAULT`/`WIFI_PASS_DEFAULT` in `config.h` are only a fallback for development, skipping the provisioning step.

## Build and flash

```bash
cd esp/ecocharge
pio run              # compile
pio run -t upload    # flash to connected ESP32
pio device monitor   # serial monitor at 115200 baud
```

## Commands the ESP32 accepts (from the API server)

Polled via `GET /api/devices/commands`:

| Command | Effect |
|---|---|
| `activate_port` / `deactivate_port` | Enable/disable a charging-port relay |
| `open_conveyor` / `close_conveyor` / `reverse_conveyor` | Conveyor motor control |
| `approve_bottle` / `reject_bottle` | Advances the bottle FSM out of `SCANNING` |
| `ping` | Heartbeat, no hardware action |

Also remotely triggerable from the admin console's kiosk detail page — the same command channel, not a separate one.

## File structure

```
esp/ecocharge/
├── include/
│   ├── config.h           — GPIO map, WiFi/API defaults, safety thresholds, bottle-FSM timing constants
│   ├── nvs_config.h        — NVS WiFi credential read/write API
│   ├── wifi_provision.h    — Captive-portal DNS server API
│   ├── bottle_fsm.h        — Bottle deposit state machine API
│   ├── relay_control.h     — Charging-port relay API
│   ├── sensor_monitor.h    — Ultrasonic + current/voltage sampling API
│   ├── self_test.h         — Boot-time hardware self-test API
│   ├── api_client.h        — API-server HTTP polling API
│   ├── wifi_sta.h / wifi_ap.h — WiFi STA / AP mode APIs
│   └── web_server.h        — Provisioning page + local test dashboard
└── src/
    ├── main.c               — Boot logic + FreeRTOS task startup
    ├── bottle_fsm.c          — IDLE/SCANNING/DROPPING/CONFIRMING/REJECTING state machine
    ├── relay_control.c       — GPIO relay driver, fail-safe boot-off, watchdog
    ├── sensor_monitor.c      — Ultrasonic + ADC1 current/voltage sampling
    ├── self_test.c           — sensor-node UART / motor / sensor self-test
    ├── wifi_reset.c          — WiFi reset button (GPIO22, hold 3 s to clear NVS)
    ├── nvs_config.c          — NVS credential persistence
    ├── wifi_provision.c      — UDP DNS server for captive portal
    ├── api_client.c          — HTTPS polling to the API server
    ├── wifi_sta.c / wifi_ap.c — WiFi STA / AP mode
    └── web_server.c          — Provisioning page, local test dashboard, SSE stream
```
