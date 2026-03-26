# EcoCharge Implementation Checklist

Living progress tracker derived from `PROJECT_PLAN.md` (phases 0–8) and the gap table in `PROJECT_ANALYSIS.md`.

**How to read:**
- `[x]` = done and committed
- `[ ]` = not yet started or incomplete
- Each item notes which file/folder the work lives in

Last updated: 2026-03-15

---

## Phase 0 — Alignment and Scope Freeze

- [x] YOLO26 declared as official detection model (`docs/PROJECT_ANALYSIS.md` updated)
- [x] `.gitignore` updated — `data_runtime.yaml` and root `.pt` files excluded
- [x] Flutter mobile app confirmed **in scope** for final submission
- [x] Architecture frozen: Flask+MySQL on Render, FastAPI on RunPod, Kiosk UI = browser on PC
- [x] Credit model confirmed: 1 bottle = 1 credit, 1 credit = 10 minutes charging
- [x] ESP32 communication: polls Render REST API over WiFi STA mode
- [x] Hardware confirmed: 1 servo (conveyor), 4 relays, 4 current sensors, 4 voltage sensors
- [ ] Formal architecture diagram (draw.io or similar) — `docs/`
- [ ] Thesis narrative updated to reflect YOLO26 (replace YOLOv8 references in paper)

---

## Phase 1 — Repository Cleanup

- [x] `server/server_main/` — Flask project skeleton created
- [x] `server/server_AI/` — FastAPI project skeleton created
- [x] `esp/motor/` renamed to `esp/ecocharge/` (production firmware folder)
- [x] `motor_control.c` / `motor_control.h` deleted (replaced by `servo_control`)
- [x] `web_server.c` cleaned up — motor endpoints removed, kiosk admin endpoints added
- [x] `wifi_ap.c` SSID updated to `EcoCharge_Config`
- [x] `esp/ecocharge/README.md` rewritten for kiosk controller
- [x] `platformio.ini` set to `build_type = release`
- [ ] `client/kiosk_electron/` — delete folder (no assigned role) or assign scope
- [ ] Fix ESLint `@eslint/compat` missing package in `client/kiosk_web` and `client/web_console`
- [ ] Add root `README.md` (architecture overview, how to run each service)

---

## Phase 2 — Backend Foundation (`server/server_main/`)

- [x] All 8 database models: `User`, `Kiosk`, `KioskSession`, `BottleDeposit`, `CreditTransaction`, `ChargingSession`, `DeviceCommand`, `DeviceTelemetry`
- [x] All 6 route blueprints: `auth`, `users`, `kiosk`, `charging`, `devices`, `admin`
- [x] Credit service — `award_credits()` / `spend_credits()`
- [x] Command service — `queue_command()` / `get_pending_commands()` / `ack_command()`
- [x] `.env.example`, `Procfile`, `seed.py` created
- [x] `requirements.txt` with all dependencies
- [ ] Run `flask db init` and generate first migration (`flask db migrate -m "initial"`)
- [ ] Run `flask db upgrade` on local MySQL to verify schema
- [ ] Deploy to Render — set `DATABASE_URL`, `JWT_SECRET_KEY`, `DEVICE_API_KEY` env vars
- [ ] Integration test: register → deposit bottle → credits awarded → start charging

---

## Phase 3 — ML Productization (`server/server_AI/`)

- [x] `BottleAttributeNet` architecture extracted to `model_arch.py` (no dep on training script)
- [x] `inference.py` — models loaded once at startup, `run(PIL.Image)` returns standard JSON
- [x] `FastAPI` app — `POST /api/detect`, `GET /health`
- [x] `Dockerfile` — PyTorch CUDA base image for RunPod
- [x] `.env.example` and `.gitignore`
- [ ] Copy `runs/detect/.../best.pt` → `server/server_AI/models/best_detector.pt`
- [ ] Copy `runs/classifier/best_classifier.pt` → `server/server_AI/models/best_classifier.pt`
- [ ] Build Docker image locally: `docker build -t ecocharge-ai .`
- [ ] Push Docker image to RunPod and deploy endpoint
- [ ] Integration test: `curl -X POST /api/detect -F image=@test_bottle.jpg` → valid JSON response
- [ ] Benchmark inference latency on RunPod hardware

---

## Phase 4 — Firmware and Hardware (`esp/ecocharge/`)

- [x] `servo_control.c/h` — LEDC PWM 50 Hz, 500–2500 µs, open/close API
- [x] `relay_control.c/h` — 4-port enable/disable, duration timeout, overcurrent trip
- [x] `sensor_monitor.c/h` — ADC1 current + voltage sampling, overcurrent detection (15A / 2 s hold)
- [x] `api_client.c/h` — HTTPS polling to Render, command execute + ack, telemetry POST
- [x] `wifi_sta.c/h` — STA mode WiFi, reconnect logic, event-based IP wait
- [x] `config.h` — full GPIO map, all constants, AP fallback settings
- [x] `main.c` — 4 FreeRTOS tasks: `safety_task`, `sensor_task`, `command_poll_task`, `telemetry_task`
- [x] `web_server.c` — local admin page (status + manual conveyor/relay control)
- [ ] Set real `WIFI_SSID_DEFAULT`, `WIFI_PASS_DEFAULT`, `RENDER_BASE_URL`, `DEVICE_API_KEY` in `config.h`
- [ ] `pio run` — confirm project compiles without errors
- [ ] Flash to hardware — verify serial logs show WiFi connected + poll loop running
- [ ] Hardware test: `activate_port` command → relay clicks on/off
- [ ] Hardware test: overcurrent threshold triggers relay shutoff
- [ ] Hardware test: servo open/close cycle
- [ ] Hardware test: sensor readings appear in telemetry POST

---

## Phase 5 — Kiosk Orchestration

> The kiosk UI (browser) acts as the local orchestrator in this architecture.
> No separate orchestrator service is needed — the UI calls the AI server and Render backend directly.

- [ ] Kiosk UI sends camera frame to RunPod AI server → receives detection JSON
- [ ] Kiosk UI calls `POST /api/kiosk/deposits` with AI result → credits awarded
- [ ] Kiosk UI calls `POST /api/charging/start` → ESP32 receives `activate_port` command
- [ ] Verify full end-to-end flow without any manual steps

---

## Phase 6 — Kiosk UI (`client/kiosk_web/`)

- [ ] Remove HeroUI template content (replace placeholder pages)
- [ ] **Welcome/Idle screen** — attract loop, "Tap to Start"
- [ ] **Login screen** — email + password, calls `POST /api/auth/login`
- [ ] **Register screen** — name, email, phone, password
- [ ] **Home screen** — credit balance, "Insert Bottle" button
- [ ] **Bottle Scan screen** — webcam access, frame capture, call RunPod `/api/detect`
- [ ] **Credits Earned screen** — shows detected bottle info + credits awarded
- [ ] **Port Selection screen** — 4 port buttons, disable any port that is `active`
- [ ] **Charging Active screen** — countdown timer, live current draw from telemetry
- [ ] **Receipt screen** — session summary, remaining balance

---

## Phase 6 — Admin Dashboard (`client/web_console/`)

- [ ] Remove HeroUI template content
- [ ] **Overview page** — live kiosk count, active sessions, total deposits today
- [ ] **Kiosks page** — per-device status, last seen, bin level
- [ ] **Deposits page** — table of all bottle deposits (brand, volume, condition, credits)
- [ ] **Charging sessions page** — active + historical, port usage
- [ ] **Credits ledger** — full transaction history per user
- [ ] **Alerts page** — overcurrent events, bin full, kiosk offline

---

## Phase 7 — Flutter Mobile App (`client/flutter_app/`)

- [ ] Remove default scaffold content
- [ ] **Login / Register screen** — calls Render `/api/auth`
- [ ] **Home screen** — credit balance + last 5 transactions
- [ ] **Transaction history screen** — paginated list
- [ ] **QR code screen** — displays `user.qr_code` for kiosk account scan

---

## Phase 8 — Testing and Thesis Evidence

### ML Evaluation
- [ ] Run `scripts/predict.py` on the 15-image test set
- [ ] Record mAP50, precision, recall for bottle detection
- [ ] Record brand / volume / condition classification accuracy
- [ ] Document in `docs/` as model evaluation report

### Backend Tests
- [ ] pytest suite for `auth` routes (register, login, refresh)
- [ ] pytest suite for `charging` routes (start, stop, active)
- [ ] pytest suite for `devices` routes (poll, ack, telemetry)
- [ ] Test credit enforcement (spend more than balance → 400)

### Integration / E2E
- [ ] End-to-end test: register → deposit → credits added → charge start → charge complete
- [ ] Fault test: overcurrent → relay off → status reflects error
- [ ] Fault test: ESP32 offline → kiosk shows port unavailable
- [ ] Fault test: backend unavailable → ESP32 retries, relays stay in safe state

### Thesis Evidence Pack
- [ ] Architecture diagram (all 5 layers)
- [ ] Hardware wiring diagram (ESP32 GPIO → components)
- [ ] UI screenshots (all kiosk and admin screens)
- [ ] Model evaluation table
- [ ] User testing summary (survey results + usability assessment)
- [ ] Pilot deployment findings (UC Lapu-Lapu and Mandaue)
- [ ] Limitations and future work section

---

## Gap Tracking (from PROJECT_ANALYSIS.md)

| Area | Status |
|---|---|
| ML bottle detection | Done — YOLO26 trained, inference service built |
| Bottle attribute classification | Done — brand/volume/condition classifier |
| Full kiosk workflow (bottle → credit → charge) | In progress — backend + firmware done, UI pending |
| Backend (Flask + MySQL) | Done — all models, routes, services created |
| Database schema | Done — 8 tables defined, migration pending |
| User accounts / auth | Done — JWT register/login/refresh |
| Charging control (relay + current monitoring) | Done — firmware implements this |
| Sensor integration | Done — ADC1 current + voltage, overcurrent trip |
| Kiosk UI | Not started |
| Admin dashboard | Not started |
| Mobile app (Flutter) | Not started |
| Hardware integration (ESP32 ↔ Render) | Firmware done, hardware test pending |
| Testing | Not started |
| Pilot deployment | Not started |
