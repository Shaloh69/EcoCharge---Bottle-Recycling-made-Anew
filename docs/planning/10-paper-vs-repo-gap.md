# EcoCharge Project Analysis

**Update, 2026-08-11: the "Hosting" and "Testing" weaknesses this document's Executive Summary and Overall Maturity Assessment call out below are both resolved as of this date — self-hosting migration is done (Docker MySQL + Node API + admin console + AI server all live on `desktop-gklhcri`, Aiven/Supabase/Render decommissioned) and real test infrastructure now exists (`vitest`/`pytest`/an E2E integration suite). Left inline below rather than rewritten, since this document's own convention is dated refresh notes, not silent edits — see `docs/planning/08-master-checklist.md` Phases A and G for the live, current status of both.**

**Refreshed 2026-08-10.** The original version of this document (2026-03-15) was written when `server/server_main` and `server/server_AI` were empty scaffolds and both client web apps were unmodified templates. That's no longer true — a real backend, a real AI inference service, and real firmware have existed and been independently verified since (`docs/planning/09-system-analysis.md`, 2026-07-22; `docs/planning/11-audit-findings.md`, 2026-08-10). This refresh keeps the paper-vs-repo framing that made the original useful, but replaces the "what the repository actually contains" section and the gap table with current, code-verified status. Where the original document is quoted or referenced below, it's marked as historical.

## Purpose

This document analyzes the EcoCharge project against two sources:

1. The thesis paper `d:\Projects-Shem\Thesis\EcoCharge-Final-2.0.pdf`
2. The current repository state — grounded in `docs/planning/09-system-analysis.md` (verified against real code 2026-07-22) and `docs/planning/11-audit-findings.md` (a later, narrower pass, 2026-08-10), not re-derived from scratch here.

The goal is unchanged from the original: show what the paper says EcoCharge should be, what's actually implemented, where the project is strong, where it's incomplete, and what still needs aligning before it's a complete thesis-grade product.

## Executive Summary

EcoCharge is described in the paper as a machine-learning-based bottle detection and smart charging kiosk for circular economy adoption at the University of Cebu Lapu-Lapu and Mandaue. The paper presents a full end-to-end system with bottle detection, account flows, credit allocation, charging-port control, trash-bin monitoring, IoT communication, and dashboard interfaces.

**As of 2026-08-10, the repository substantially matches that vision at the systems-integration level** — this is a real change from the original March 2026 analysis, which found the backend "effectively missing" and both client apps still template scaffolds. What's now true:

- A real, integrated backend (Node.js/Express/TypeScript/Prisma, not the Flask originally planned) implements auth, kiosk sessions, bottle deposits, credits, charging, device commands, telemetry, and admin operations — all verified against real routes and a real Prisma schema.
- The ESP32 firmware implements the full hardware role the paper describes: conveyor control, 4-port relay charging, entrance/bin ultrasonic sensing, current/voltage sensing, and a real bottle-deposit finite state machine — not just the motor-control prototype the original analysis found.
- The AI pipeline (YOLO26 detector → EfficientNet-B0 multi-head classifier) is a real, deployed inference service, not just training scripts.
- The full bottle-to-credit-to-charge user journey is implemented end-to-end in code, verified step by step in `docs/planning/09-system-analysis.md` §6–§7.

**What's still genuinely incomplete, verified this session, not assumed:**

- **Hosting**: the system still runs on Render + Aiven MySQL + Supabase Storage + a rotating Cloudflare quick-tunnel for the AI server — the self-hosting migration the team decided on (`docs/planning/03-revamp-master.md` §1) hasn't started.
- **Design**: both web apps carry a custom color-token layer, but neither has been rebuilt against the actual design mandate (`docs/planning/02-design-mandate.md`) yet — no typography swap, no kiosk step-wizard flow, no animation stack on the Flutter app.
- **Testing**: no automated tests exist anywhere in the repo — backend, AI server, or Flutter app.
- **Two firmware fixes and a key rotation** are proposed with exact values (`docs/planning/11-audit-findings.md`) but deliberately not yet flashed, pending explicit sign-off.
- **Thesis evidence pack** (formal architecture diagram, model evaluation report, pilot findings) has not been assembled.

In plain terms: the paper-to-repo gap this document originally found — "a strong ML prototype, a separate motor-control firmware prototype, and placeholder client applications that have not yet been integrated" — is **closed**. The system is integrated and functionally real. What remains is hosting migration, visual design execution, hardware validation, and the evidence/testing work needed for a defense — which is a materially different, much narrower gap than the original analysis found.

## What The Thesis Defines

*(Unchanged from the original analysis — the paper itself hasn't been revised as part of this pass.)*

### Project Intent

The paper frames EcoCharge as a sustainability system that encourages bottle recycling by converting plastic bottle deposits into charging rewards. It is rooted in:

- Circular Economy Theory
- Behavioural Incentive Theory
- Technology Acceptance Model

### Core Objectives From The Paper

1. Determine the required hardware, software, IoT platform, protocol, and dashboard
2. Design the bottle detection and IoT-based visualization system
3. Evaluate detection accuracy, charging reliability and safety, and dashboard usability
4. Deploy and assess the system in a real environment with emphasis on ease of use and usefulness

### Functional System Described In The Paper

- Bottle detection and validation
- Size-based bottle classification
- Account registration and login
- Charging credits or charging access
- User-facing kiosk interface
- Web or app-based monitoring
- Trash-bin level monitoring
- IoT-connected hardware and dashboard
- Multiple charging ports
- Real-world deployment and usability evaluation

### Hardware Described In The Paper

Computer, camera bottle detector, touchscreen monitor, ESP32, servo motor, current sensor, relay, breaker, exhaust fan, outlet sockets, power supply, ultrasonic sensor.

### Software Stack Described In The Paper — vs. what actually got built

| Paper says | Actually built | Status |
|---|---|---|
| Python Flask | **Node.js + Express + TypeScript + Prisma** | Deliberate divergence — the team built the backend in a different stack than the paper specifies. This needs a thesis-narrative decision the same way the YOLO version did (see below): update the paper to describe the real stack, or document the divergence explicitly as a design decision. Not yet resolved either way as of this refresh. |
| OpenCV, NumPy | Used within the AI service (`server/server_AI`) | Consistent |
| MySQL | MySQL — **self-hosted in Docker on `desktop-gklhcri` (port 13306) since 2026-08-11**; Aiven decommissioned | Consistent (**row corrected 2026-08-12** — previously still said "Aiven-hosted currently, self-hosting migration planned") |
| Flutter + Dart | Real Flutter app, calling the real API (`ApiService`) | Consistent, and further along than the paper's own description implies — this isn't a planned nice-to-have, it's built and functional |
| Next.js | Two real Next.js 15 apps (kiosk web, admin console) | Consistent |
| Tailwind CSS v4 | In use (`@theme` tokens in `styles/globals.css`) | Consistent |
| YOLO Ultralytics | YOLO26, not YOLOv8 | **Decision already made** (2026-03-15, this document's own prior revision): YOLO26 is official. Confirm the thesis narrative itself has actually been updated to say so — that was flagged as a to-do in the original CHECKLIST and its status hasn't been independently re-verified in this pass. |
| Google Colab | Not verified either way in this pass | — |

### User Need Validation From The Paper

Unchanged — the paper's survey data (78.8% supported a reward-based recycling system, 84.8% interested in a bottle-for-charging kiosk, 66.7% highly willing to support implementation, 57.6% unaware of existing recycling programs) still stands as the demand justification. This is separate from, and doesn't require re-verifying against, the system's own implementation status.

## What The Repository Actually Contains (refreshed 2026-08-10)

### Repository Overview

Top-level areas, current real structure per `docs/planning/09-system-analysis.md` §2: `client/kiosk_web`, `client/web_console`, `client/flutter_app`, `server/server_main`, `server/server_AI`, `esp/ecocharge`, `esp/esp32_sensor`, `scripts/`, `runs/`.

### `scripts/` and `runs/` — still the most mature, unchanged assessment

Training pipeline (`train_yolo.py`, `train_bottle_classifier.py`, `predict.py`, `gui_detect.py`) and dataset remain as strong as the original analysis found. **New since the original analysis: the trained weights are now actually deployed** — `server/server_AI/models/best_detector.pt` and `best_classifier.pt` are present and in use by the live inference service, closing the "no deployment wrapper" gap the original analysis flagged.

### `server/server_main` — real backend, not a Flask skeleton

Node/Express/TypeScript/Prisma. Auth (JWT + guest), kiosk sessions, bottle-deposit FSM integration, credits ledger, charging sessions, device command queue + telemetry, admin CRUD + analytics + real-time SSE. Full endpoint inventory in `docs/planning/09-system-analysis.md` §8. Security fixes (kiosk endpoint auth, bin-full guard) and operational fixes (guest rate limiting, stale-session sweep) landed 2026-08-10 — see `docs/planning/11-audit-findings.md` and `memory.md`.

### `server/server_AI` — real inference service, not just training scripts

FastAPI, two-stage pipeline (YOLO26 detector → `BottleAttributeNet` EfficientNet-B0, three heads: brand/volume/condition), `X-Api-Key` auth, `GET /health`. Hosted on a local PC behind a Cloudflare **quick** tunnel — the rotating-URL problem `docs/planning/09-system-analysis.md` flagged is still unresolved (fix: `docs/planning/03-revamp-master.md` §1.2, move to Tailscale Serve).

### `esp/ecocharge` — real kiosk controller firmware, not a motor-control prototype

The original analysis found "motor movement, AP mode networking, simple web control" and explicitly noted this was *not yet* the thesis kiosk controller — no relay control, no current sensing, no bin monitoring, no bottle-credit logic. **All of that gap is now closed**: v2.0.0 implements the full 5-state bottle FSM, 4-port relay charging with an independent 3600s watchdog, 3× HC-SR04 ultrasonic sensing (entrance + bin-top + bin-bottom), current/voltage sensing across **two ESP32s** (rev 3.0.0, 2026-08-20 — a second ESP32 replaced the Raspberry Pi Pico, putting all eight analog channels on a WiFi-safe ADC1), and a WiFi provisioning captive portal. Full hardware map in `docs/planning/09-system-analysis.md` §11.

**Two known gaps, precisely scoped, not vague:** `SCANNING` has no timeout (can nudge a bottle indefinitely under specific failure conditions) and `CONFIRMING` doesn't re-check the bin sensor before finalizing a reject. Both have exact proposed fixes in `docs/planning/11-audit-findings.md`, deliberately not yet flashed pending review — see `docs/planning/03-revamp-master.md` §3.2–§3.3.

### `client/kiosk_web` and `client/web_console` — real, functional, not yet visually redesigned

Both build and run real EcoCharge flows against the live API — this is a fundamentally different state than the original analysis's "still a starter app" / "functionally identical duplicate" finding, which predates the backend existing at all. Both now carry custom Tailwind v4 color tokens and a customized HeroUI theme (`hero.ts`) — the generic-template-branding gap is closed. **What's still open**: neither has been rebuilt against the actual design mandate (`docs/planning/02-design-mandate.md`) — no typography swap, no kiosk step-wizard/idle-timeout, confirmed via dependency grep 2026-08-10.

### `client/flutter_app` — real, API-integrated, not a default scaffold

The original analysis's "Hello World, no EcoCharge logic, no auth, no API integration" finding is fully superseded. Real screens (splash/onboarding, login/register, home, kiosk-QR scan, credit balance/transactions, deposit history, charging view/stop, profile) call the real API (`docs/planning/09-system-analysis.md` §13). `lib/models/mock_data.dart`, the last leftover from the scaffold era, has been deleted (confirmed zero importers before removal). **Still open**: no visual redesign yet, no automated tests, no crash reporting found.

## Paper-To-Repository Gap Analysis (refreshed)

| Area | Thesis Expectation | Current Repository State | Status |
| --- | --- | --- | --- |
| ML bottle detection | YOLO-based detection integrated into kiosk | Real, deployed two-stage pipeline, live weights in `server/server_AI/models/` | **Done** |
| Bottle attribute logic | Bottle validation and classification | Brand/volume/condition classifier, in production use via `/api/detect` | **Done** |
| Full kiosk workflow | Bottle → credit → user session → charging | Implemented end to end in code, traced step-by-step in `docs/planning/09-system-analysis.md` §6–§7 | **Done** (two firmware edge cases still open, see `docs/planning/11-audit-findings.md`) |
| Backend | Storage, dashboard, system data flow | Real Node/Express/Prisma API, all major route groups implemented | **Done** — stack differs from the paper (Node, not Flask); needs a thesis-narrative decision, not more code |
| Database | MySQL, account/transaction storage | Real Prisma schema, 9+ tables, auto-migrated at startup | **Done** — self-hosted in Docker on `desktop-gklhcri` since 2026-08-11 (**row corrected 2026-08-12** — previously still said "still hosted on Aiven, not yet self-hosted") |
| User accounts | Register/login/account balance | Real JWT auth (registered + guest), credit balance tracked | **Done** |
| Charging control | Four charging ports, relay/current monitoring | Real relay control + current/voltage sensing + independent safety watchdog | **Done** |
| Sensor integration | Ultrasonic, current sensor, relay, servo | All implemented; 3× ultrasonic, current/voltage on all 4 ports (split across two ESP32s, rev 3.0.0), 4× relay, conveyor (not a servo trapdoor — a conveyor-belt design instead) | **Done**, with two decisions worth naming explicitly in the thesis: the conveyor substituted for the paper's servo/trapdoor concept, and the two-microcontroller split that the ESP32's WiFi/ADC2 conflict forces (see `docs/evidence/hardware-wiring-diagram.md`) |
| Trash-bin monitoring | Bin status visible in interface | Bin-level telemetry drives real admin alerts (≥80%/≥95%) and a server-side deposit cutoff at ≥95%; kiosk-facing UI treatment not yet built | **Mostly done** — admin-side complete, kiosk-side pending the design revamp |
| Kiosk UI | Dedicated kiosk application | Real, functional Next.js app against the live API; visual redesign not yet executed | **Functional, not yet redesigned** |
| Admin web/dashboard | Monitoring console | Real, functional dashboard (overview, kiosks, sessions, deposits, charging, credits, users, alerts, ml-review, analytics, settings); visual redesign not yet executed | **Functional, not yet redesigned** |
| Mobile app | Flutter-based user app | Real, API-integrated app; visual redesign not yet executed | **Functional, not yet redesigned** |
| Hardware control | IoT kiosk controller | Full firmware implementation, verified against the real GPIO map | **Done**, two edge-case fixes pending sign-off |
| Real deployment evidence | Trial deployment and evaluation loop | Not yet — self-hosting migration and hardware validation are prerequisites | **Not started** |
| Automated testing | (Implied by "evaluate ... reliability and safety") | None found anywhere in the repo | **Not started** — see `docs/planning/05-feature-build-checklist.md` Stage 1 |

## Key Inconsistencies And Risks (refreshed)

### 1. Thesis Scope vs Code Scope — closed

The original finding ("the repo is still split into disconnected prototypes") no longer holds. The remaining scope gap is narrower: hosting location, visual polish, and evidence/testing — not missing integration.

### 2. Architecture Mismatch — mostly resolved, one open decision

The paper's Flask/MySQL/Next.js/Flutter/IoT stack is now real, except the backend is Node instead of Flask. This is a documentation decision (update the paper, or document the divergence), not an implementation gap.

### 3. YOLO Version — resolved

**Decision (2026-03-15, unchanged): YOLO26 is official.** No code changes needed. Confirm the thesis narrative itself reflects this before defense — not independently re-verified in this pass.

### 4. Hardware Mismatch — resolved

The firmware now covers relays, charging ports, current sensors, and ultrasonic bin sensing. The paper's servo/trapdoor concept was implemented as a conveyor system instead — a real design decision worth stating explicitly in the thesis, not a gap.

### 5. Product Duplication — resolved

`client/kiosk_web` and `client/web_console` are no longer identical templates; they're distinct, real products (kiosk UI vs. admin dashboard) against the same backend.

### 6. Missing System Of Record — resolved

Accounts, credits, history, sessions, and admin monitoring all persist against a real database.

### 7. Repo Hygiene — improved, not fully resolved

The Flask prototype (`server_main/app/`) and 27 Knip-verified unused files across both Next.js apps were deleted 2026-08-10. Generated ML artifacts under `runs/` are still committed to the working tree — unchanged from the original finding, still worth a policy decision (external storage vs. accepted as-is for a thesis-scale project).

## Recommended Target Architecture — achieved

The five-layer architecture the original analysis recommended (detection, device control, local orchestrator, backend, client) is now real: the kiosk web app itself is the local orchestrator (confirmed in `docs/planning/09-system-analysis.md` — there's no separate orchestrator process; the browser calls the AI server and the Node API directly), sitting alongside the other four layers exactly as originally recommended.

## Overall Maturity Assessment (refreshed)

### Strong
- ML pipeline (trained, deployed, in production use)
- Firmware (full hardware role implemented, not just a prototype)
- Backend (complete, functionally real)
- System integration (the full bottle-to-charge journey works end to end in code)

### Medium
- Client applications (functionally real, visually unreformed)
- Repo hygiene (much improved, some artifact-policy decisions still open)

### Weak
- Hosting (still fully on the original Render/Aiven/Supabase stack the migration was meant to replace)
- Testing and verification discipline (no automated tests exist anywhere)
- Thesis evidence packaging (not yet assembled)

## Final Assessment (refreshed)

The March 2026 assessment — "a solid thesis concept, a credible ML prototype, a separate embedded control prototype, an unfinished application platform" — is no longer accurate. As of 2026-08-10, EcoCharge is a working, integrated system: a user can genuinely deposit a bottle, get it AI-graded, earn credits, and charge a phone, end to end, against real infrastructure.

**The most important shift now is different from the original's:** the project has already made the move from "research idea plus component experiments" to "one defined system with one architecture." What's left is not integration work — it's **operationalization**: get the system off borrowed cloud infrastructure and onto infrastructure the team controls, finish the two hardware edge cases and the key rotation, execute the design system that's already specified but not yet built, and build the testing and evidence base a real defense needs. Track this work in `docs/planning/03-revamp-master.md` and `docs/planning/05-feature-build-checklist.md`, not by re-deriving it from this document each time.
