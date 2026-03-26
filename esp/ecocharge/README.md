# EcoCharge ESP32 Kiosk Controller

This folder contains the ESP-IDF firmware for the EcoCharge kiosk hardware controller.
It runs on an ESP32 dev board and manages all physical subsystems: the bottle conveyor gate (servo), four charging port relays, and four current/voltage sensor pairs.

## Role in the System

```
Render Backend  ←—— HTTPS REST ——→  ESP32 (WiFi STA)
                                         |
                                         +-- Servo GPIO 18        — conveyor gate
                                         +-- Relay 1–4 GPIO 25–27, 14 — charging ports
                                         +-- Current sensors GPIO 32–35 (ACS712)
                                         +-- Voltage sensors GPIO 36, 39 (voltage dividers)
```

The ESP32 does **not** make decisions. It is a hardware executor:
- Polls `GET /api/devices/commands` on the Render backend every 2 seconds
- Executes whatever command arrives (open conveyor, enable relay, etc.)
- Posts live sensor telemetry back to Render every 5 seconds
- The Render backend (not the ESP32) decides when to charge and for how long

---

## Boot Modes

On every boot, the firmware checks NVS flash for saved WiFi credentials:

### Normal Mode (credentials saved)
Connects to WiFi → polls Render for commands → posts telemetry.
The hardware test page is accessible at `http://<kiosk-IP>/test` while on the same network.

### Provisioning Mode (no credentials yet)
Starts a WiFi Access Point (`EcoCharge_Config`) and a captive-portal DNS server.
Connect a phone → browser auto-opens → navigate to `/provision` → enter WiFi SSID and password → save → ESP32 reboots into Normal Mode.

---

## First-Time Setup

1. Flash the firmware (credentials are not required at compile time)
2. Power on the ESP32
3. Connect a phone to the `EcoCharge_Config` WiFi network (password: `ecocharge123`)
4. The browser should auto-open. If not, navigate to `http://192.168.4.1/provision`
5. Enter your WiFi credentials and tap **Save & Connect**
6. The ESP32 reboots and connects to your router

To reset credentials (re-run provisioning), open `http://<kiosk-IP>/test` and click **Reset WiFi**.

---

## Hardware Test Page

After provisioning, connect to `http://<kiosk-IP>/test` from any browser on the same network.

| Feature | Description |
|---|---|
| Live sensor table | Current (A) and voltage (V) per port, updates every 500 ms via SSE |
| Relay control | Per-port ON (10 s / 30 s / 10 min) and OFF buttons |
| Emergency off | Cuts all 4 relays immediately |
| Servo slider | Drag 0–180° or use Open/Close buttons |
| WiFi status | Shows connected SSID; Reset WiFi button |
| Reboot | Soft reboot from the browser |

---

## Hardware

| Component | Qty | Notes |
|---|---|---|
| ESP32 dev board | 1 | 38-pin or 30-pin |
| L298N motor driver | 1 | Controls conveyor belt DC motor |
| DC motor | 1 | Conveyor belt drive |
| Relay module (4-channel) | 1 | Active LOW, opto-isolated |
| ACS712 current sensor | 4 | One per charging port (20A variant) |
| Voltage divider module | 4 | AC voltage sensor 0–250 V → 0–3.3 V |
| ADS1115 I2C ADC | 1 | For SW4 voltage and current sensors |
| Charging outlets | 4 | Controlled via relays |

## GPIO Map

### Per-Port Assignments (SW1–SW4)

All sensor pins are on **ADC1** and are WiFi-safe.

| Port | Voltage GPIO | ADC channel | Current GPIO | ADC channel | Relay GPIO |
|---|---|---|---|---|---|
| SW1 | 32 | ADC1_CH4 | 33 | ADC1_CH5 | 25 |
| SW2 | 36 | ADC1_CH0 | 39 | ADC1_CH3 | 26 |
| SW3 | 34 | ADC1_CH6 | 35 | ADC1_CH7 | 16 |
| SW4 | ADS1115 CH0 | I2C | ADS1115 CH1 | I2C | 5 |

SW4 uses an **ADS1115 I2C ADC module** (GPIO 17 and 18 have no analog capability).
Connect: SDA → GPIO 21, SCL → GPIO 22, ADDR → GND.

### Conveyor Motor (L298N)

| Signal | GPIO | Notes |
|---|---|---|
| L298N IN1 | 19 | Direction pin 1 |
| L298N IN2 | 23 | Direction pin 2 |
| L298N ENA | 18 | LEDC PWM 1 kHz — speed control |

### Other Pins

| Function | GPIO | Notes |
|---|---|---|
| I2C SDA (ADS1115) | 21 | SW4 sensors |
| I2C SCL (ADS1115) | 22 | SW4 sensors |
| Status LED | 27 | External LED + resistor |

### What Changed from Original Wiring

| Signal | Old GPIO | New GPIO | Reason |
|---|---|---|---|
| SW1 voltage | 12 | 32 | GPIO 12 is ADC2 (WiFi conflict) |
| SW1 current | 14 | 33 | GPIO 14 is ADC2 (WiFi conflict) |
| SW1 relay   | 33 | 25 | GPIO 33 freed for SW1 current sensor |
| SW2 relay   | 35 | 26 | GPIO 35 freed for SW3 current sensor |
| SW3 voltage | 15 | 34 | GPIO 15 is ADC2 (WiFi conflict) |
| SW3 current |  2 | 35 | GPIO 2 is ADC2 (WiFi conflict) |
| SW4 voltage | 17 | ADS1115 CH0 | GPIO 17 has no ADC |
| SW4 current | 18 | ADS1115 CH1 | GPIO 18 has no ADC |
| Servo | 18 | 4 | GPIO 18 was taken by SW4 current |
| Status LED  |  2 | 27 | GPIO 2 was taken by SW3 current |

---

## Configuration

Before flashing, set the server credentials in `include/config.h`:

```c
#define RENDER_BASE_URL   "https://your-ecocharge-app.onrender.com"
#define DEVICE_API_KEY    "your-device-secret"   // must match server .env
#define KIOSK_ID          1                       // must match kiosk.id in DB
```

WiFi credentials are entered at runtime via the provisioning page and stored in NVS.
The `WIFI_SSID_DEFAULT` / `WIFI_PASS_DEFAULT` values in `config.h` are only used as a fallback
if NVS is empty (useful during development to skip the provisioning step).

---

## Build and Flash

```bash
cd esp/ecocharge
pio run              # compile
pio run -t upload    # flash to connected ESP32
pio device monitor   # serial monitor at 115200 baud
```

---

## Commands the ESP32 Accepts (from Render)

The ESP32 polls `GET /api/devices/commands?kiosk_id=<id>` and executes:

| Command | Payload | Effect |
|---|---|---|
| `activate_port` | `{"port": 1, "duration_seconds": 600}` | Enable relay; auto-off after duration |
| `deactivate_port` | `{"port": 1}` | Disable relay immediately |
| `open_conveyor` | `{}` | Start conveyor belt forward |
| `close_conveyor` | `{}` | Stop conveyor belt |
| `ping` | `{}` | Heartbeat — no hardware action |

---

## Safety

| Rule | Behaviour |
|---|---|
| Overcurrent | Port drawing ≥ 15 A for > 2 s → relay trips automatically |
| Relay timeout | Relays auto-off after `duration_seconds` (hard cap: 3600 s) |
| Conveyor auto-close | Gate closes automatically 5 s after opening if no close command |
| WiFi loss | All relays disabled if WiFi drops for > 30 s |

---

## File Structure

```
esp/ecocharge/
├── include/
│   ├── config.h           — GPIO map, WiFi defaults, API constants, safety thresholds
│   ├── nvs_config.h       — NVS WiFi credential read/write API
│   ├── wifi_provision.h   — Captive-portal DNS server API
│   ├── servo_control.h    — Conveyor servo API
│   ├── relay_control.h    — Charging port relay API
│   ├── sensor_monitor.h   — Current + voltage ADC API
│   ├── api_client.h       — Render HTTP polling API
│   ├── wifi_sta.h         — WiFi STA connection API
│   ├── wifi_ap.h          — WiFi AP mode API
│   └── web_server.h       — Web server API (provision + test pages)
└── src/
    ├── main.c             — Boot logic + FreeRTOS task startup
    ├── nvs_config.c       — NVS credential persistence
    ├── wifi_provision.c   — UDP DNS server for captive portal
    ├── servo_control.c    — LEDC PWM servo driver
    ├── relay_control.c    — GPIO relay driver with timeouts
    ├── sensor_monitor.c   — ADC1 current + voltage sampling
    ├── api_client.c       — HTTPS polling to Render backend
    ├── wifi_sta.c         — WiFi STA mode with NVS credential loading
    ├── wifi_ap.c          — WiFi AP mode for provisioning
    └── web_server.c       — Provision page, hardware test page, SSE stream
```
