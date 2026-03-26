# EcoCharge — Repository Analysis

**Date:** 2026-03-25
**Branch:** main
**Working Directory:** `D:\Projects-Shem\Thesis\2026\EcoCharge`

---

## Executive Summary

EcoCharge is a machine-learning-based bottle detection and smart charging kiosk system for circular economy adoption in a Philippine university setting. The project consists of five major subsystems:

1. **Machine Learning Pipeline** — YOLO object detection + CNN attribute classification
2. **Embedded Firmware** — ESP32 main controller + Raspberry Pi Pico sensor reader
3. **Backend Services** — Flask REST API + FastAPI AI inference service
4. **Frontend Applications** — Next.js kiosk UI, Next.js admin dashboard, Flutter mobile app
5. **Infrastructure** — Self-hosted AI inference on local PC via Cloudflare Tunnel

**Overall Maturity:** ML and firmware are near-complete; backend is structurally ready but undeployed; frontend is all templates; integration is zero.

---

## Directory Structure

```
EcoCharge/
├── client/
│   ├── flutter_app/        # Flutter mobile companion app (placeholder)
│   ├── kiosk_web/          # Next.js 15 kiosk touchscreen UI (template)
│   └── web_console/        # Next.js 15 admin dashboard (template)
├── docs/
│   ├── CHECKLIST.md        # Living progress tracker
│   ├── PROJECT_ANALYSIS.md # Gap analysis (thesis vs. implementation)
│   └── PROJECT_PLAN.md     # 8-phase implementation roadmap
├── esp/
│   ├── ecocharge/          # ESP32 main firmware (ESP-IDF 5.5, PlatformIO)
│   └── pico_sensors/       # Raspberry Pi Pico sensor reader (Arduino/PlatformIO)
├── runs/
│   ├── classifier/         # Trained CNN checkpoints + training curves
│   └── detect/             # YOLO detection training outputs
├── scripts/
│   ├── dataset/Eco-Charge.v1/  # Annotated bottle image dataset (148 images)
│   ├── train_yolo.py           # YOLO detection training
│   ├── train_bottle_classifier.py  # Multi-head CNN training
│   ├── predict.py              # CLI inference tool
│   └── gui_detect.py           # GUI validation tool
└── server/
    ├── server_main/        # Flask REST API (main backend) → Render
    └── server_AI/          # FastAPI AI inference service → local PC / Cloudflare Tunnel
```

---

## Component Analysis

### 1. Machine Learning Pipeline

**Maturity: 85%**

A two-stage inference pipeline:

| Stage | Component | Output |
|-------|-----------|--------|
| Stage 1 | YOLO object detector | Bounding box + confidence |
| Stage 2 | BottleAttributeNet CNN | Brand, volume (ml), condition |

#### Dataset (`scripts/dataset/Eco-Charge.v1/`)
- **Total images:** 148 (train: 103, val: 30, test: 15)
- **Source:** Roboflow (EcoCharge dataset v1)
- **Metadata:** `bottle_measurements.csv` (filename, brand, volume_ml, height_cm, condition)
- **Class inventory:**
  - **Brand:** 10 classes (Coca-Cola, Sprite, Royal, Pocari Sweat, Nature's Spring, Mountain Dew, 7-UP, etc.)
  - **Volume:** 11 classes (190ml, 237ml, 330ml, 500ml, 750ml, 1000ml, 1500ml, etc.)
  - **Condition:** 2 classes (perfect, imperfect)

#### Model Architecture

**BottleAttributeNet (PyTorch):**
```
Backbone: EfficientNet-B0 (ImageNet pretrained)  →  (batch, feat_dim)
Shared:   Linear(feat_dim→256) → ReLU → Dropout(0.3)
Heads:
  Brand:     Linear(256→128→10)
  Volume:    Linear(256→64→11)
  Condition: Linear(256→64→2)
```

#### Inference Output Schema
```json
{
  "detected": true,
  "confidence": 0.94,
  "bounding_box": [x1, y1, x2, y2],
  "brand": "Coca-Cola",
  "brand_confidence": 0.88,
  "volume_ml": 500,
  "volume_confidence": 0.91,
  "condition": "perfect",
  "condition_confidence": 0.97
}
```

#### Trained Weights
| File | Location | Status |
|------|----------|--------|
| YOLO best | `runs/detect/ecocharge_bottle_det/weights/best.pt` | ✅ Exists |
| Classifier best | `runs/classifier/best_classifier.pt` | ✅ Exists |
| Label maps | `runs/classifier/label_maps.json` | ✅ Exists |
| Server models dir | `server/server_AI/models/` | ❌ Empty — needs copy |

#### Gaps
- Model weights not yet copied to `server/server_AI/models/`
- Inference latency not benchmarked on local hardware

---

### 2. Embedded Firmware

**Maturity: 95% (ESP32) / 90% (Pico)**

#### ESP32 Kiosk Controller (`esp/ecocharge/`)

**Role:** Hardware executor. Polls backend for commands, controls relays and conveyor, reports sensor data.

**Framework:** ESP-IDF 5.5 via PlatformIO. Build confirmed passing.

**GPIO Map (30-pin ESP32):**

| Function | GPIO | Notes |
|----------|------|-------|
| L298N IN1 | 19 | Motor direction |
| L298N IN2 | 23 | Motor direction |
| L298N ENA | 18 | LEDC PWM 1 kHz |
| SW1 Voltage | 32 (ADC1_CH4) | Direct ADC, via 10kΩ+10kΩ divider |
| SW1 Current | 33 (ADC1_CH5) | Direct ADC, via 10kΩ+10kΩ divider |
| SW3 Voltage | 34 (ADC1_CH6) | Direct ADC, via 10kΩ+10kΩ divider |
| SW3 Current | 35 (ADC1_CH7) | Direct ADC, via 10kΩ+10kΩ divider |
| Pico UART RX | 17 | SW2+SW4 sensor data from Pico |
| Pico UART TX | 4 | (reserved) |
| Relay 1 (SW1) | 25 | SSR control |
| Relay 2 (SW2) | 26 | SSR control |
| Relay 3 (SW3) | 16 | SSR control |
| Relay 4 (SW4) | 5 | SSR control |
| Status LED | 27 | + 10kΩ to GND |

**Sensor Architecture:**
- SW1 and SW3: voltage + current sensors read directly via ADC1 (GPIO 32–35)
- SW2 and SW4: sensors read by Pico (GP26–GP27), sent over UART every 500ms
- All sensor signals pass through a 10kΩ + 10kΩ voltage divider (5V sensor supply → 2.5V max to ADC)

**FreeRTOS Tasks:**

| Task | Interval | Function |
|------|----------|----------|
| `safety_task` | Continuous | Relay timeouts, overcurrent trip, LED blink |
| `sensor_task` | 100 ms | ADC + Pico UART polling |
| `command_poll_task` | 2 s | GET `/api/devices/commands` from Render |
| `telemetry_task` | 5 s | POST sensor readings to Render |

**Commands accepted:**

| Command | Payload | Effect |
|---------|---------|--------|
| `activate_port` | `{port, duration_seconds}` | Enable SSR relay; auto-off after duration |
| `deactivate_port` | `{port}` | Disable relay immediately |
| `open_conveyor` | `{}` | Run conveyor forward |
| `close_conveyor` | `{}` | Stop conveyor |
| `ping` | `{}` | Heartbeat acknowledgement |

**Safety features:**
- Overcurrent trip: ≥15A sustained >2s → relay auto-disables
- Relay hard-cap: max 3600s per activation
- WiFi loss watchdog: all relays disabled after 30s disconnect

**Boot sequence:**
1. NVS read for WiFi credentials
2. Credentials found → WiFi STA → normal polling operation
3. No credentials → WiFi AP (`EcoCharge_Config`) → captive portal DNS → user provisions via `/provision` page → reboot

**Local web server endpoints:**
- `/provision` — WiFi credential setup (AP mode only)
- `/test` — Live sensor readings, per-relay control, conveyor control
- `/api/sse` — Server-Sent Events stream (500ms sensor updates)

**Source files:**

| File | Purpose |
|------|---------|
| [`esp/ecocharge/src/main.c`](esp/ecocharge/src/main.c) | Boot logic + FreeRTOS task creation |
| [`esp/ecocharge/src/conveyor_motor.c`](esp/ecocharge/src/conveyor_motor.c) | L298N LEDC PWM driver |
| [`esp/ecocharge/src/relay_control.c`](esp/ecocharge/src/relay_control.c) | GPIO relay driver with timeout |
| [`esp/ecocharge/src/sensor_monitor.c`](esp/ecocharge/src/sensor_monitor.c) | ADC1 + UART2 Pico sensor reader |
| [`esp/ecocharge/src/api_client.c`](esp/ecocharge/src/api_client.c) | HTTPS polling to backend |
| [`esp/ecocharge/src/wifi_sta.c`](esp/ecocharge/src/wifi_sta.c) | WiFi STA with NVS credentials |
| [`esp/ecocharge/src/wifi_ap.c`](esp/ecocharge/src/wifi_ap.c) | WiFi AP mode for provisioning |
| [`esp/ecocharge/src/wifi_provision.c`](esp/ecocharge/src/wifi_provision.c) | UDP DNS server (captive portal) |
| [`esp/ecocharge/src/web_server.c`](esp/ecocharge/src/web_server.c) | Local HTTP server (provision + test) |
| [`esp/ecocharge/src/nvs_config.c`](esp/ecocharge/src/nvs_config.c) | NVS WiFi credential storage |
| [`esp/ecocharge/include/config.h`](esp/ecocharge/include/config.h) | GPIO map, API URLs, safety thresholds |

#### Raspberry Pi Pico Sensor Reader (`esp/pico_sensors/`)

**Role:** Reads SW2 and SW4 analog sensors, streams raw ADC values to ESP32 over UART.

**ADC pins (standard Pico, GP26–GP27 only exposed on some 30-pin clones):**

| Pico Pin | Sensor |
|----------|--------|
| GP26 (ADC0) | SW2 voltage sensor (via 10kΩ+10kΩ divider) |
| GP27 (ADC1) | SW2 current sensor (via 10kΩ+10kΩ divider) |

> Note: GP28/GP29 not available on user's Pico variant. SW4 sensor assignment pending — options are a second ADC-capable board or analog mux.

**UART:**
- Pico GP0 (TX) → ESP32 GPIO 17 (RX)
- Pico GP1 (RX) ← ESP32 GPIO 4 (TX)
- Baud: 115200

**Output format:** `SW2V,SW2I,0,0\n` (12-bit integers, 500ms interval)

**Gaps:**
- SW4 sensors have no available ADC pins on current Pico board (GP28/GP29 absent)
- SW4 readings default to 0 until resolved
- Hardware validation not done

---

### 3. Backend Services

#### Flask Main API (`server/server_main/`)

**Maturity: 80%**

**Stack:** Flask 3.1.0 · SQLAlchemy · Flask-Migrate · Flask-JWT-Extended · PyMySQL · Gunicorn

**Database models (8):**

| Model | Key Fields |
|-------|-----------|
| `User` | id, name, email, phone, password_hash, qr_code, credit_balance, is_admin |
| `Kiosk` | id, name, location, api_key, status (online/offline/error), last_seen_at |
| `KioskSession` | id, user_id, kiosk_id, started_at, ended_at |
| `BottleDeposit` | id, session_id, brand, volume_ml, condition, confidence, credits_awarded |
| `ChargingSession` | id, user_id, kiosk_id, port_number, credits_used, duration_seconds, status |
| `CreditTransaction` | id, user_id, type (EARN/SPEND), amount, balance_after, ref_type, ref_id |
| `DeviceCommand` | id, kiosk_id, command_type, payload (JSON), status, created_at, executed_at |
| `DeviceTelemetry` | id, kiosk_id, sensor_data (JSON), timestamp |

**Routes (6 blueprints, 20+ endpoints):**

| Blueprint | Prefix | Key Endpoints |
|-----------|--------|---------------|
| `auth` | `/api/auth` | POST `/register`, `/login`, `/refresh` |
| `users` | `/api/users` | GET `/profile`, `/transactions`; PUT `/profile` |
| `charging` | `/api/charging` | POST `/start`, `/stop/<id>`; GET `/active` |
| `devices` | `/api/devices` | GET `/commands`; POST `/commands/<id>/ack`, `/telemetry` |
| `kiosk` | `/api/kiosk` | POST `/sessions/start`, `/deposits`; GET `/status` |
| `admin` | `/api/admin` | GET `/overview`, `/kiosks`, `/deposits`, `/charging`, `/credits/ledger`, `/alerts` |

**Deployment:** Render (render.com) + MySQL on Render

**Gaps:**
- `flask db init / migrate / upgrade` not yet run
- No data in database; no deployment done

#### FastAPI AI Inference Service (`server/server_AI/`)

**Maturity: 85%**

**Stack:** FastAPI · PyTorch 2.2.0 · Ultralytics YOLO · Pillow · Uvicorn

**Deployment decision (updated):** Self-hosted on user's local Windows 11 PC via Cloudflare Tunnel — free, no time limits, HTTPS automatic. See [`SELF_HOSTING.md`](SELF_HOSTING.md) for full setup guide.

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness probe |
| POST | `/api/detect` | YOLO + CNN inference on uploaded image |

**Startup sequence:**
1. Load YOLO weights from `YOLO_WEIGHTS` env var
2. Load classifier checkpoint from `CLASSIFIER_WEIGHTS` env var
3. Reconstruct `BottleAttributeNet` with correct backbone and class counts
4. Prepare image transforms (224×224, ImageNet normalization)

**Authentication:** Bearer token (matches `AI_API_KEY`)

**Gaps:**
- Model files not yet placed in `server/server_AI/models/`
- NSSM Windows service not set up
- Cloudflare Tunnel not configured
- `config.h` `AI_SERVER_URL` needs updating to Cloudflare Tunnel URL

---

### 4. Frontend Applications

#### Kiosk Web UI (`client/kiosk_web/`)

**Maturity: 5%**

**Stack:** Next.js 15.5.9 · React 18.3.1 · TypeScript · Tailwind CSS 4 · HeroUI v2

**Current state:** HeroUI template shell — no EcoCharge logic.

**Planned screens:**
1. Welcome/Idle — attract loop, "Tap to Start"
2. Login — email + password
3. Register — name, email, phone, password
4. Home — credit balance, "Insert Bottle" button
5. Bottle Scan — webcam capture, inference call
6. Credits Earned — detected bottle info + award display
7. Port Selection — 4 port buttons
8. Charging Active — countdown timer, live current draw
9. Receipt — session summary, remaining balance

#### Admin Dashboard (`client/web_console/`)

**Maturity: 5%**

**Stack:** Identical to kiosk_web

**Planned screens:**
1. Overview — active sessions, deposits today, kiosk count
2. Kiosks — per-device status, last seen
3. Deposits — filterable table of all bottle deposits
4. Charging — active and historical sessions
5. Credits Ledger — full transaction history per user
6. Alerts — overcurrent events, bin full, kiosk offline

#### Flutter Mobile App (`client/flutter_app/`)

**Maturity: 1%**

**Stack:** Flutter SDK ^3.9.2 · Dart · Material Design

**Current state:** Default "Hello World" scaffold.

**Planned screens:**
1. Login / Register
2. Home — credit balance + last 5 transactions
3. Transaction History — paginated
4. QR Code — displays `user.qr_code` for kiosk scan

---

### 5. Documentation (`docs/`)

| File | Lines | Purpose |
|------|-------|---------|
| [`docs/PROJECT_ANALYSIS.md`](docs/PROJECT_ANALYSIS.md) | 515 | Thesis-vs-implementation gap analysis |
| [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) | 537 | 8-phase implementation roadmap |
| [`docs/CHECKLIST.md`](docs/CHECKLIST.md) | 193 | Living progress tracker |
| [`SELF_HOSTING.md`](SELF_HOSTING.md) | — | Self-hosting AI server guide (Philippines) |

---

## System Architecture

### Deployment Topology

```
┌─────────────────────────────────────────────────────┐
│  RENDER (Cloud)                                      │
│  Flask REST API  ←──── MySQL Database                │
│  /api/auth, /api/kiosk, /api/devices, /api/admin    │
└──────────┬──────────────────────────────┬───────────┘
           │ HTTPS                        │ HTTPS
           │                              │
┌──────────▼──────────┐        ┌──────────▼──────────┐
│  LOCAL PC (Thesis)   │        │  KIOSK (Local PC)    │
│  FastAPI AI Service  │        │  Next.js kiosk_web   │
│  POST /api/detect    │◄───────│  + USB Camera        │
│  Cloudflare Tunnel   │        └──────────┬───────────┘
│  → yourdomain.com    │                   │ HTTPS (polling)
└─────────────────────┘        ┌──────────▼───────────┐
                                │  ESP32 DevKit (30p)   │
                                │  (WiFi STA mode)      │
                                │  ├─ Conveyor (L298N)  │
                                │  ├─ 4 SSR Relays (AC) │
                                │  └─ 4 ADC sensors     │
                                │       │ UART 115200   │
                                │  Raspberry Pi Pico    │
                                │  (SW2 sensors GP26/27)│
                                └──────────────────────┘
```

### End-to-End Flow (Single Bottle-to-Charge Session)

```
1. User taps kiosk screen
   └─ kiosk_web → POST /api/auth/login → Flask → JWT tokens

2. User inserts bottle
   └─ kiosk_web captures webcam frame
   └─ kiosk_web → POST /api/detect → Local PC (via Cloudflare Tunnel)
   └─ FastAPI: YOLO detect → CNN classify → {brand, volume, condition}
   └─ kiosk_web → POST /api/kiosk/deposits → Flask
   └─ Flask: credit_service.award_credits(user, 1) → CreditTransaction

3. User selects charging port
   └─ kiosk_web → POST /api/charging/start → Flask
   └─ Flask: spend_credits() → command_service.queue_command()

4. ESP32 polls and activates port
   └─ ESP32 → GET /api/devices/commands → Flask (every 2s)
   └─ ESP32: relay_control_enable(port, duration)
   └─ ESP32 → POST /api/devices/commands/<id>/ack → Flask

5. Monitoring
   └─ ESP32 → POST /api/devices/telemetry → Flask (every 5s)
   └─ Admin dashboard → GET /api/admin/overview → Flask

6. Session ends
   └─ Relay auto-disables after duration
   └─ Flask marks ChargingSession as completed
   └─ kiosk_web shows receipt
```

---

## Hardware Bill of Materials

| Component | Qty | Role |
|-----------|-----|------|
| ESP32 DevKit (30-pin) | 1 | Main kiosk controller |
| Raspberry Pi Pico | 1 | SW2 sensor reader (GP26=voltage, GP27=current) |
| L298N Motor Driver | 1 | Conveyor belt H-bridge control |
| DC Motor (5V–12V) | 1 | Conveyor belt drive |
| SSR Relay Module (×4 or 4-ch) | 4 | AC outlet switching per port |
| ACS712-20A Current Sensor | 4 | Per-port current monitoring |
| Voltage Divider Module | 4 | Per-port voltage monitoring |
| 10kΩ Resistors | 16 | Sensor output voltage dividers (2 per sensor) |
| AC Charging Outlets | 4 | User device charging |
| 5V DC Power Supply | 1 | ESP32 + Pico + sensors |

---

## Completion Status

| Component | Maturity | Blocker |
|-----------|----------|---------|
| ML Training Pipeline | 85% | Weights not in server_AI/models/ |
| ESP32 Firmware | 95% | Hardware validation not done |
| Pico Firmware | 90% | SW4 ADC pins not available on board |
| Flask Backend | 80% | DB migrations not run; not deployed |
| FastAPI AI Service | 85% | Models missing; Cloudflare Tunnel not set up |
| Kiosk Web UI | 5% | All 9 screens not implemented |
| Admin Dashboard | 5% | All 6 screens not implemented |
| Flutter App | 1% | Scaffold only; 4 screens not implemented |
| Database Schema | 80% | Defined in ORM; not migrated |
| E2E Integration | 0% | Depends on frontend + deployed backend |
| Automated Tests | 0% | No test suite |
| CI/CD | 0% | No pipeline configured |

---

## Critical Gaps

1. **Frontend (0% functional)** — All three client apps are empty templates. No API calls wired up.
2. **Database not deployed** — `flask db migrate/upgrade` not run; MySQL has no tables.
3. **Model files not in inference container** — `server/server_AI/models/` is empty; AI service fails on startup.
4. **Cloudflare Tunnel not set up** — AI server not yet publicly reachable; ESP32 `AI_SERVER_URL` still points to RunPod placeholder.
5. **SW4 sensors unresolved** — Pico board lacks GP28/GP29; SW4 reads as 0.0 until hardware is resolved.
6. **No hardware testing** — Relay actuation, overcurrent trip, and sensor calibration not validated on real hardware.
7. **No automated tests** — No pytest, no integration tests, no CI/CD pipeline.

---

## Immediate Next Steps (Priority Order)

1. **Copy model weights** → `runs/classifier/best_classifier.pt` + `runs/detect/.../best.pt` → `server/server_AI/models/`
2. **Set up Cloudflare Tunnel** → Follow [`SELF_HOSTING.md`](SELF_HOSTING.md); update `AI_SERVER_URL` in `config.h`; reflash ESP32
3. **Run DB migrations** → `flask db init && flask db migrate && flask db upgrade`; deploy Flask to Render
4. **Implement kiosk screens** → Replace HeroUI template with 9 real screens
5. **Implement admin screens** → Replace template with 6 real screens
6. **Resolve SW4 sensors** → 38-pin ESP32 (gives GPIO36+39), or second Pico, or analog mux
7. **Hardware validation** → Flash firmware, test relay actuation, verify sensor readings, calibrate ADC
8. **End-to-end test** → Bottle → credit → port selection → relay activation → receipt → admin visible
9. **Decide Flutter scope** → Implement 4 screens or formally descope with documented rationale
10. **CI/CD setup** → GitHub Actions for lint, build, and test checks
