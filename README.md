# EcoCharge

A reverse-vending kiosk that rewards PET bottle recycling with phone-charging credits. A user deposits a plastic bottle, an ESP32-driven conveyor and a two-stage AI vision pipeline (YOLO26 detector → EfficientNet-B0 classifier) identify and grade it, credits are awarded by volume tier, and those credits pay for phone charging at one of four relay-switched AC ports. Built as a 2026 thesis project for the University of Cebu Lapu-Lapu and Mandaue.

## How it works

1. A user authenticates at the kiosk touchscreen — QR-scan with the mobile app, or Continue as Guest.
2. They place a PET bottle on the conveyor. An entrance ultrasonic sensor triggers the conveyor to start nudging the bottle under a camera while the AI pipeline runs.
3. On acceptance, the conveyor drops the bottle into the bin; a second, independent bin sensor confirms the drop before credits are awarded (1–3 credits, by volume tier).
4. Credits pay for phone charging at one of four ports, each relay-switched and monitored for real-time voltage/current.

Full, code-verified system documentation: [`docs/planning/09-system-analysis.md`](docs/planning/09-system-analysis.md).

## Repository structure

| Path | Stack | Role |
|---|---|---|
| [`client/kiosk_web`](client/kiosk_web) | Next.js 15 + shadcn/ui | The kiosk touchscreen UI — camera capture, deposit flow, charging flow |
| [`client/web_console`](client/web_console) | Next.js 15 + Mantine + Recharts | Admin dashboard — live telemetry, CRUD, analytics, remote kiosk control |
| [`client/flutter_app`](client/flutter_app) | Flutter | Companion mobile app — register/login, QR-link to a kiosk, balances, history |
| [`client/web`](client/web) | Next.js + shadcn/ui | Public promotional website — how it works, changelog, docs, app download, `/update-required`. Deployed and screenshot-verified 2026-08-11 (`docs/planning/08-master-checklist.md` Phase E4); `/download` serves a real release APK. Remaining: the formal `/design-review` + `avoid-ai-design` passes |
| [`server/server_main`](server/server_main) | Node.js + Express + TypeScript + Prisma | Central API — auth, sessions, deposits, credits, charging, device commands, SSE, admin |
| [`server/server_AI`](server/server_AI) | Python + FastAPI + PyTorch/Ultralytics | Two-stage bottle detection & classification inference service |
| [`esp/ecocharge`](esp/ecocharge) | ESP32, ESP-IDF (PlatformIO), FreeRTOS | Kiosk hardware controller — conveyor, relays, sensors, bottle FSM, WiFi provisioning |
| [`esp/esp32_sensor`](esp/esp32_sensor) | ESP32, ESP-IDF (PlatformIO) | **Sensor node (hardware rev 3.0.0)** — reads charging ports 3 & 4 (voltage + current) on its own ADC1 with WiFi never started, and streams raw counts to the controller over UART. Replaced the Raspberry Pi Pico 2026-08-20; see [`docs/evidence/hardware-wiring-diagram.md`](docs/evidence/hardware-wiring-diagram.md) for why |
| [`scripts/`](scripts) | Python (Ultralytics, PyTorch) | Model training pipeline (`train_yolo.py`, `train_bottle_classifier.py`) and dataset tooling |

## Documentation map — start here, not with the code

**All planning, status, and reference documents now live under [`docs/planning/`](docs/planning) in one numbered series** — consolidated 2026-08-12 from a previous scatter across the repo root and `docs/`, which had let three documents go stale independently while a more current one sat beside them. Only this file and `memory.md` remain at root. Read in this order:

1. [`docs/planning/00-start-here.md`](docs/planning/00-start-here.md) — the current kickoff/status prompt. Read this first.
2. [`docs/planning/08-master-checklist.md`](docs/planning/08-master-checklist.md) — **the single source of truth for what is actually done.** Every other status claim in this repo defers to it.
3. [`docs/planning/09-system-analysis.md`](docs/planning/09-system-analysis.md) — full system audit, verified against real code (architecture, data model, API surface, hardware map, FSMs).
4. [`docs/planning/11-audit-findings.md`](docs/planning/11-audit-findings.md) — a later, narrower pass: findings, fixes applied, and exact proposed values for the two firmware fixes still awaiting sign-off before any flash.
5. [`docs/planning/03-revamp-master.md`](docs/planning/03-revamp-master.md) — the active migration/rework plan (self-hosting, security, design).
6. [`docs/planning/02-design-mandate.md`](docs/planning/02-design-mandate.md) — the design system spec: banned patterns, tokens, the light/dark dual palette, per-surface screen specs, and the screenshot-verification loop. Evidence index: [`docs/design-screenshots/README.md`](docs/design-screenshots/README.md).
7. [`docs/planning/06-must-have-app-features.md`](docs/planning/06-must-have-app-features.md) — the cross-surface feature bar every client app is held to.
8. [`docs/planning/07-ai-detection-improvements.md`](docs/planning/07-ai-detection-improvements.md) — the AI detection pipeline explained, a diagnosed real-world detection issue, and a dataset-expansion plan.
9. [`docs/planning/05-feature-build-checklist.md`](docs/planning/05-feature-build-checklist.md) — remaining testing/evidence work.
10. [`memory.md`](memory.md) — the cross-session decision log. Read this before re-raising something that's already been decided.

Also present: [`docs/planning/10-paper-vs-repo-gap.md`](docs/planning/10-paper-vs-repo-gap.md) (thesis-paper-vs-repository gap analysis), [`docs/planning/12-self-hosting-guide.md`](docs/planning/12-self-hosting-guide.md) (from-scratch setup + model-training walkthrough), [`docs/planning/13-project-roadmap.md`](docs/planning/13-project-roadmap.md) (phase roadmap), and [`docs/evidence/`](docs/evidence) (thesis evidence pack).

## Current status (2026-08-20)

The full bottle-to-credit-to-charge journey is implemented end to end — a functionally complete, integrated system, not a set of disconnected prototypes. Aiven, Supabase, and Render are all fully decommissioned; the system is self-hosted on `desktop-gklhcri`.

> **All services are up, and service persistence is now proven across a real reboot** (host rebooted 2026-08-18; everything came back on its own — the `/RU SYSTEM` Task-Scheduler fix from the 2026-08-12 outage postmortem held). The five public quick-tunnel URLs **rotate on every tunnel restart** — the current set, each verified live, is always in `docs/planning/08-master-checklist.md` Phase A's top banner, along with the proven rotation runbook. Never trust a tunnel URL written down anywhere else.

What's still in progress:

- **Two firmware fixes** (a `SCANNING`-state timeout, a `CONFIRMING`-state bin-sensor re-check) — implemented in source, exact values from `docs/planning/11-audit-findings.md`, still awaiting the actual flash (needs physical hardware access + explicit sign-off, neither available remotely).
- **Design revamp** — tokens and mandate defined (`docs/planning/02-design-mandate.md`); HeroUI has been dropped entirely from both Next.js apps (Mantine on the admin console, shadcn/ui on the kiosk), with a first real component/bug-fix pass done on both plus the new public website scaffolded — full current status, including what's still screenshot-unverified, in `docs/planning/08-master-checklist.md` Phase E.
- **Testing infrastructure** — built 2026-08-11: `vitest` (backend), `pytest` (AI server), and a real integration suite against an isolated test database. See `docs/planning/08-master-checklist.md` Phase G.

## Running the system

The system now runs self-hosted on `desktop-gklhcri`, not Render/Aiven — see `docs/planning/08-master-checklist.md` Phase A for the live topology and public URLs (they rotate on tunnel restart; check that document or `D:\EcoCharge\logs\cloudflared\*.log` on the host for the current ones, don't trust a URL written down elsewhere). For local development, each service still has its own dependencies and `.env.example`:

```bash
# API server
cd server/server_main && npm install && npm run dev

# AI inference server (separate venv — see docs/planning/12-self-hosting-guide.md)
cd server/server_AI && .venv\Scripts\activate && uvicorn app.main:app --reload

# Kiosk web / Admin console / public website
cd client/kiosk_web && npm install && npm run dev
cd client/web_console && npm install && npm run dev
cd client/web && npm install && npm run dev

# Mobile app
cd client/flutter_app && flutter pub get && flutter run
```

Local dev's `DATABASE_URL` needs either an SSH tunnel to `desktop-gklhcri`'s MySQL or a separate local instance — the live `.env` points at `127.0.0.1:13306`, which is only correct when running on that host itself (`docs/planning/08-master-checklist.md` Phase A, open item). `docs/planning/12-self-hosting-guide.md` predates this migration (dated 2026-03-31, describes a Render/RunPod/NSSM-based setup) — it's kept for the from-scratch model-training walkthrough (still generally accurate) but its hosting/deployment sections describe a superseded approach; see that file's own correction banner.
