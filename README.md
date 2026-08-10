# EcoCharge

A reverse-vending kiosk that rewards PET bottle recycling with phone-charging credits. A user deposits a plastic bottle, an ESP32-driven conveyor and a two-stage AI vision pipeline (YOLO26 detector → EfficientNet-B0 classifier) identify and grade it, credits are awarded by volume tier, and those credits pay for phone charging at one of four relay-switched AC ports. Built as a 2026 thesis project for the University of Cebu Lapu-Lapu and Mandaue.

## How it works

1. A user authenticates at the kiosk touchscreen — QR-scan with the mobile app, or Continue as Guest.
2. They place a PET bottle on the conveyor. An entrance ultrasonic sensor triggers the conveyor to start nudging the bottle under a camera while the AI pipeline runs.
3. On acceptance, the conveyor drops the bottle into the bin; a second, independent bin sensor confirms the drop before credits are awarded (1–3 credits, by volume tier).
4. Credits pay for phone charging at one of four ports, each relay-switched and monitored for real-time voltage/current.

Full, code-verified system documentation: [`analyzation.md`](analyzation.md).

## Repository structure

| Path | Stack | Role |
|---|---|---|
| [`client/kiosk_web`](client/kiosk_web) | Next.js 15 + HeroUI | The kiosk touchscreen UI — camera capture, deposit flow, charging flow |
| [`client/web_console`](client/web_console) | Next.js 15 + HeroUI + Recharts | Admin dashboard — live telemetry, CRUD, analytics, remote kiosk control |
| [`client/flutter_app`](client/flutter_app) | Flutter | Companion mobile app — register/login, QR-link to a kiosk, balances, history |
| [`server/server_main`](server/server_main) | Node.js + Express + TypeScript + Prisma | Central API — auth, sessions, deposits, credits, charging, device commands, SSE, admin |
| [`server/server_AI`](server/server_AI) | Python + FastAPI + PyTorch/Ultralytics | Two-stage bottle detection & classification inference service |
| [`esp/ecocharge`](esp/ecocharge) | ESP32, ESP-IDF (PlatformIO), FreeRTOS | Kiosk hardware controller — conveyor, relays, sensors, bottle FSM, WiFi provisioning |
| [`esp/pico_sensors`](esp/pico_sensors) | Raspberry Pi Pico, Arduino core | Extra ADC channels the ESP32's WiFi-constrained ADC can't cover, streamed over UART |
| [`scripts/`](scripts) | Python (Ultralytics, PyTorch) | Model training pipeline (`train_yolo.py`, `train_bottle_classifier.py`) and dataset tooling |

## Documentation map — start here, not with the code

This project has been through several audit/rework passes; these documents are kept current and are the actual source of truth, in the order you'd read them:

1. [`docs/planning/00-start-here.md`](docs/planning/00-start-here.md) — the current kickoff/status prompt. Read this first.
2. [`analyzation.md`](analyzation.md) — full system audit, verified against real code (architecture, data model, API surface, hardware map, FSMs).
3. [`AUDIT.md`](AUDIT.md) — a later, narrower pass: findings, fixes applied, and exact proposed values for the two firmware fixes still awaiting sign-off before any flash.
4. [`docs/planning/03-revamp-master.md`](docs/planning/03-revamp-master.md) — the active migration/rework plan (self-hosting, security, design).
5. [`docs/planning/02-design-mandate.md`](docs/planning/02-design-mandate.md) + [`DESIGN.md`](DESIGN.md) — the design system spec and its as-built execution status.
6. [`docs/planning/07-ai-detection-improvements.md`](docs/planning/07-ai-detection-improvements.md) — the AI detection pipeline explained, a diagnosed real-world detection issue, and a dataset-expansion plan.
7. [`docs/planning/05-feature-build-checklist.md`](docs/planning/05-feature-build-checklist.md) — remaining testing/evidence work.
8. [`memory.md`](memory.md) — the cross-session decision log. Read this before re-raising something that's already been decided.

`docs/CHECKLIST.md` is a one-screen status board across all of the above.

## Current status (2026-08-10)

The full bottle-to-credit-to-charge journey works end to end against real infrastructure — this is a functionally complete, integrated system, not a set of disconnected prototypes. What's still in progress:

- **Self-hosting migration** — target machine and architecture confirmed (`desktop-gklhcri`, Docker-based MySQL + self-hosted Supabase on Disk D), execution not yet started. Still running on Render + Aiven MySQL + Supabase Storage + a rotating Cloudflare quick-tunnel today.
- **Two firmware fixes** (a `SCANNING`-state timeout, a `CONFIRMING`-state bin-sensor re-check) — exact values proposed in `AUDIT.md`, awaiting sign-off before flashing.
- **Design revamp** — tokens and mandate defined (`DESIGN.md`, `docs/planning/02-design-mandate.md`), visual rebuild not yet started on any of the three client surfaces.
- **Testing infrastructure** — no automated tests exist yet anywhere in the repo; see `docs/planning/05-feature-build-checklist.md` Stage 1.

## Running the system locally (current, pre-migration state)

Each service has its own dependencies and `.env.example` — see that service's README for detail. At a high level:

```bash
# API server
cd server/server_main && npm install && npm run dev

# AI inference server (separate venv — see SELF_HOSTING.md)
cd server/server_AI && .venv\Scripts\activate && uvicorn app.main:app --reload

# Kiosk web / Admin console
cd client/kiosk_web && npm install && npm run dev
cd client/web_console && npm install && npm run dev

# Mobile app
cd client/flutter_app && flutter pub get && flutter run
```

Model training and self-hosting the AI server behind a Cloudflare Tunnel are documented in full in [`SELF_HOSTING.md`](SELF_HOSTING.md). These commands describe the system as it runs today (Render/Aiven-backed); they'll change once the self-hosting migration in `docs/planning/03-revamp-master.md` §1 lands — that document, not this README, is the live source of truth for run instructions during the migration.
