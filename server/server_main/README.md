# EcoCharge — API Server

The central backend: auth (registered + guest), kiosk sessions, the bottle-deposit flow, credits ledger, charging sessions, ESP32 device commands + telemetry, real-time SSE, and all admin operations.

## Stack

Node.js + Express + TypeScript + Prisma, MySQL (currently Aiven-hosted, migrating to a self-hosted Docker instance — see `../../docs/planning/03-revamp-master.md` §1.3). Migrations auto-apply at server startup (`src/startup.ts`, with self-healing for Prisma's P3009/P3018 failure states — there is no manual migration step today).

## Running

```bash
npm install
npm run dev          # tsx watch src/index.ts
```

Other scripts: `npm run build` / `npm start` (compiled), `npm run db:migrate` (`prisma migrate deploy`), `npm run seed`.

Requires a `.env` (not committed — see `.env.example`). Full variable-by-variable reference: `../../docs/planning/09-system-analysis.md` §14. The database URL, Supabase credentials, and allowed-origins list all change as part of the self-hosting migration — don't assume the current `.env.example` reflects the post-migration shape.

## API surface

Full route-by-route inventory (method, path, purpose, auth requirement): `../../docs/planning/09-system-analysis.md` §8. Real-time channels: `../../docs/planning/09-system-analysis.md` §8's SSE subsection (`GET /api/kiosk/:id/sse` for kiosk-facing telemetry, `GET /api/admin/sse` for the admin dashboard).

## Security notes — read before touching auth-adjacent code

- Kiosk read endpoints (`/list`, `/:id/ports`, `/:id/sse`) require `requireAuth` as of 2026-08-10 — `/qr-status` is deliberately public (it's the QR-login bootstrap itself, secured by a single-use 5-minute-TTL token, not a JWT-gateable route).
- The device API key (per-kiosk, DB-stored) comparison is a DB lookup, not constant-time — accepted as-is, see `../../memory.md`.
- Guest-facing endpoints (session creation, deposits, charging starts) are per-IP rate-limited.

Full findings/fix history: `../../docs/planning/11-audit-findings.md`.
