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
| [`client/kiosk_web`](client/kiosk_web) | Next.js 15 + shadcn/ui | The kiosk touchscreen UI — camera capture, deposit flow, charging flow |
| [`client/web_console`](client/web_console) | Next.js 15 + Mantine + Recharts | Admin dashboard — live telemetry, CRUD, analytics, remote kiosk control |
| [`client/flutter_app`](client/flutter_app) | Flutter | Companion mobile app — register/login, QR-link to a kiosk, balances, history |
| [`client/web`](client/web) | Next.js + shadcn/ui | Public promotional website — how it works, changelog, docs, app download. Scaffolded 2026-08-10 (home/how-it-works/changelog/docs/about/download, all 6 routes build clean); visual polish and screenshot-verification still open, see `docs/planning/08-master-checklist.md` Phase E4 |
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

## Current status (2026-08-11)

The full bottle-to-credit-to-charge journey works end to end against real infrastructure — this is a functionally complete, integrated system, not a set of disconnected prototypes. **The self-hosting migration is done** (corrected 2026-08-11 — the below was stale): Aiven, Supabase, and Render are all fully decommissioned. Docker MySQL, the Node API, the admin console, and the AI server all run as persistent services on `desktop-gklhcri`, each on its own public Cloudflare quick tunnel — see `docs/planning/08-master-checklist.md` Phase A for live URLs and verification evidence. What's still in progress:

- **Two firmware fixes** (a `SCANNING`-state timeout, a `CONFIRMING`-state bin-sensor re-check) — implemented in source, exact values from `AUDIT.md`, still awaiting the actual flash (needs physical hardware access + explicit sign-off, neither available remotely).
- **Design revamp** — tokens and mandate defined (`DESIGN.md`, `docs/planning/02-design-mandate.md`); HeroUI has been dropped entirely from both Next.js apps (Mantine on the admin console, shadcn/ui on the kiosk), with a first real component/bug-fix pass done on both plus the new public website scaffolded — full current status, including what's still screenshot-unverified, in `docs/planning/08-master-checklist.md` Phase E.
- **Testing infrastructure** — built 2026-08-11: `vitest` (backend), `pytest` (AI server), and a real integration suite against an isolated test database. See `docs/planning/08-master-checklist.md` Phase G.

## Running the system

The system now runs self-hosted on `desktop-gklhcri`, not Render/Aiven — see `docs/planning/08-master-checklist.md` Phase A for the live topology and public URLs (they rotate on tunnel restart; check that document or `D:\EcoCharge\logs\cloudflared\*.log` on the host for the current ones, don't trust a URL written down elsewhere). For local development, each service still has its own dependencies and `.env.example`:

```bash
# API server
cd server/server_main && npm install && npm run dev

# AI inference server (separate venv — see SELF_HOSTING.md)
cd server/server_AI && .venv\Scripts\activate && uvicorn app.main:app --reload

# Kiosk web / Admin console / public website
cd client/kiosk_web && npm install && npm run dev
cd client/web_console && npm install && npm run dev
cd client/web && npm install && npm run dev

# Mobile app
cd client/flutter_app && flutter pub get && flutter run
```

Local dev's `DATABASE_URL` needs either an SSH tunnel to `desktop-gklhcri`'s MySQL or a separate local instance — the live `.env` points at `127.0.0.1:13306`, which is only correct when running on that host itself (`docs/planning/08-master-checklist.md` Phase A, open item). `SELF_HOSTING.md` predates this migration (dated 2026-03-31, describes a Render/RunPod/NSSM-based setup) — it's kept for the from-scratch model-training walkthrough (still generally accurate) but its hosting/deployment sections describe a superseded approach; see that file's own correction banner.
