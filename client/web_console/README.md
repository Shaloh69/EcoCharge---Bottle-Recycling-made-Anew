# EcoCharge — Admin Console

The operations dashboard for the whole system: live kiosk telemetry, CRUD over users/deposits/charging/credits, remote kiosk hardware control, and analytics.

## Stack

Next.js 15 (App Router), HeroUI, Tailwind CSS v4, Recharts. Auth is a JWT in `sessionStorage` plus a value-less `admin_authed=1` cookie (SameSite=Strict); Next.js edge middleware gates `/dashboard/**` on that cookie.

## Real pages, not a template

All under `/dashboard`: overview (live SSE stats), kiosks (CRUD + device API key) and per-kiosk detail (live telemetry, relay/conveyor/bottle remote controls, command audit log), sessions, deposits, charging, credits (transaction ledger), users, alerts (kiosk offline / bin fullness), ml-review (low-confidence AI detections), analytics (kWh/credits/cost charts), settings (the tunable economics — credit tiers, energy budget, rate limits). Full endpoint-level detail in `analyzation.md` §10.

The kiosk remote-control channel (`POST /api/admin/kiosks/:id/command` — activate/deactivate a port, open/close/reverse the conveyor, approve/reject a bottle, ping) is real, working infrastructure — the strongest "admin can unstick a physical problem" capability in the whole system. See `docs/planning/06-must-have-app-features.md`'s appendix for why this is worth calling out specifically.

## Running

```bash
npm install
npm run dev
```

Requires `NEXT_PUBLIC_API_URL` — see `.env.local` (not committed).

## Design status

Functional, not yet visually rebuilt. The target design ("Operations Console" — dense, dark-mode-first, monitoring-oriented) is specified in `../../docs/planning/02-design-mandate.md` §3 — read that before touching any UI here, not this file. Load the `dataviz` skill before touching the analytics charts specifically.
