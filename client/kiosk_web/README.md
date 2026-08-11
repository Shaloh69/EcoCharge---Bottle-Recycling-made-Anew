# EcoCharge — Kiosk Web

The touchscreen UI that runs on the physical kiosk PC's browser. This is also the system's local orchestrator — there's no separate orchestrator process; this app owns the camera, calls the AI server, and drives the whole deposit/charging session (see `../../docs/planning/09-system-analysis.md` §3, §5, and `../../docs/planning/13-project-roadmap.md`'s Phase 5).

## Stack

Next.js 15 (App Router), HeroUI, Tailwind CSS v4, framer-motion. Session state (token/session/user) lives in `sessionStorage`.

## Real flow, not a template

`/` (idle/attract) → `/auth` (QR or guest) → `/session` (menu) → `/session/deposit` (camera capture → AI detect → approve/reject) → `/session/bin` (bin-confirmation wait) → `/session/credits`, `/session/charging` (port grid, live SSE) → `/session/result`, `/receipt/charge`, `/receipt/credit`, plus `/diag` (diagnostics). Full detail in `../../docs/planning/09-system-analysis.md` §9.

Two server-side proxy routes keep secrets off the client: `POST /api/detect` (streams to the AI server with its API key attached) and `GET /api/health-ai` / `GET /api/health-backend`.

## Running

```bash
npm install
npm run dev
```

Requires `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_KIOSK_ID`, `AI_URL`, `AI_KEY` — see `.env.local` (not committed; ask for the current values or see `../../docs/planning/09-system-analysis.md` §14 for what each controls).

## Design status

Functional, not yet visually rebuilt. The target design ("Clean Energy Reward") is specified in `../../docs/planning/02-design-mandate.md` §4 — read that before touching any UI here, not this file.

## A known issue worth reading before touching the deposit flow

`app/session/deposit/page.tsx`'s capture loop and the ESP32 firmware's conveyor-nudge loop are two independent timers with no shared synchronization signal — this is the leading suspected cause of a real reported problem ("bottles not detected properly inside the conveyor"). Full diagnosis and proposed fix: `../../docs/planning/07-ai-detection-improvements.md` §2.1.
