# EcoCharge — System Analysis

**Last Updated:** 2026-04-10
**Branch:** main

---

## Executive Summary

EcoCharge is an IoT-integrated smart kiosk system that incentivizes plastic bottle recycling by awarding phone-charging credits. Users scan a QR code to authenticate, deposit PET/HDPE bottles through an AI vision pipeline, earn credits, and spend them to charge their devices at one of four AC ports.

**Current State (April 2026):** System is functionally implemented and deployed to Render. Backend API, Kiosk Web, and Admin Console are live. ESP32 firmware is hardware-ready. AI server runs locally via Cloudflare Tunnel. End-to-end integration is in progress.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                            CLIENTS                               │
│                                                                  │
│  Flutter App (mobile)   Kiosk Web (Next.js)   Admin Console     │
│  - QR / credits         - Touch kiosk UI       (Next.js)        │
│  - Auth / history       - Bottle deposit FSM   - Live dashboard  │
│                         - Charging flow        - Analytics       │
└────────────┬──────────────────────┬─────────────────────────────┘
             │ REST + SSE           │ REST + SSE
             ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│               Node.js API Server (Express + Prisma)              │
│  /api/auth  /api/users  /api/kiosk  /api/charging                │
│  /api/devices  /api/admin                                        │
│                     MySQL (Aiven, TLS)                           │
└────────┬────────────────────────────────────┬────────────────────┘
         │ HTTPS (Cloudflare Tunnel)          │ HTTPS poll
         ▼                                    ▼
   AI Server (FastAPI)                  ESP32 Kiosk
   YOLOv8 + CNN                         FreeRTOS
   /health, /scan                       Conveyor, Relays
   Local PC                             INA219, Ultrasonic
```

---

## Services & Deployment

| Service | Stack | Hosting | URL |
|---|---|---|---|
| API Server | Node.js 20 + Express + Prisma | Render | `ecocharge-api.onrender.com` |
| Kiosk Web | Next.js 15 | Render | `ecocharge-vyu6.onrender.com` |
| Admin Console | Next.js 15 | Render | Render (URL TBD) |
| Database | MySQL 8 | Aiven | Private (TLS, `sslca=certs/ca.pem`) |
| AI Server | FastAPI + YOLOv8 | Local PC + Cloudflare Tunnel | Tunnel URL (changes on restart — set named tunnel) |

---

## Security Implementation

### Authentication

| Layer | Method | Implementation |
|---|---|---|
| User / Admin | JWT (HS256) | Access token + refresh token via `/api/auth/login` and `/api/auth/refresh` |
| Device (ESP32) | Static API key | Timing-safe compare via `crypto.timingSafeEqual` — prevents timing oracle attacks |
| SSE (EventSource) | `?token=` query param | `EventSource` API cannot set custom headers; middleware reads both `Authorization` header and `?token=` |

**Auth middleware (`src/middleware/auth.ts`):**
- `requireAuth` — accepts Bearer header OR `?token=` query param
- `requireAdmin` — extends requireAuth, checks `isAdmin` claim in JWT payload
- `requireDeviceKey` — timing-safe key comparison, rejects on length mismatch

### CORS

- `origin: '*'` combined with `credentials: true` is **rejected by browsers** (CORS spec §3.2) — any credentialed cross-origin request is blocked
- Fixed: explicit `ALLOWED_ORIGINS` allowlist parsed from env var at startup
- All deployed frontend URLs must be in `ALLOWED_ORIGINS` on Render

```
ALLOWED_ORIGINS=https://ecocharge-vyu6.onrender.com,https://your-console.onrender.com
```

After changing this env var: **manually trigger a redeploy** on the API service in Render.

### Admin Console Auth

- JWT stored in `sessionStorage` (cleared on tab close, not persisted to disk)
- Companion cookie `admin_authed=1` set on login (value-less, SameSite=Strict) — allows Next.js edge middleware to gate `/dashboard/**` without accessing sessionStorage
- Login page enforces `is_admin: true` before accepting — regular user accounts are rejected client-side
- Logout clears both sessionStorage token and the cookie

### Transport

- Aiven MySQL requires TLS — `DATABASE_URL` uses `sslca=certs/ca.pem` (note: `ssl-ca` with hyphen is **ignored** by mysql2; correct param is `sslca`)
- CA cert at `server/server_main/certs/ca.pem` — committed (removed from `.gitignore`)

---

## Data Flow — Bottle Deposit (FSM)

```
1.  User taps kiosk screen → opens kiosk web app
2.  User scans QR from mobile app
3.  Kiosk web: POST /api/kiosk/qr-link → creates KioskSession, stores token in memory map (5 min TTL)
4.  Kiosk web: polls GET /api/kiosk/qr-status?token=... → returns JWT + session_id when matched
5.  User places bottle on entrance sensor
6.  ESP32 detects via ultrasonic → sends POST /api/devices/telemetry (bottle_at_entrance=true)
7.  Kiosk web broadcasts image to AI server → POST /scan → {brand, volume_ml, condition, confidence}
8.  Kiosk web: POST /api/kiosk/bottle/approve → creates BottleDeposit (status: pending_bin)
    Server queues `approve_bottle` command for ESP32
9.  ESP32 polls GET /api/devices/commands → receives approve_bottle → runs conveyor forward
10. Bottle falls into bin → ultrasonic bin sensors confirm
11. ESP32: POST /api/devices/telemetry (bottle_in_bin=true)
12. Server: confirms deposit (status: confirmed) → awards credits → broadcasts SSE `bottleInBin`
13. Kiosk UI shows credits awarded

Timeout path:
  If bottle_in_bin never fires → ESP32 sends fsm_state=confirming + bottle_in_bin=false
  Server: marks deposit as rejected, credits=0 → broadcasts SSE confirmed=false
```

---

## Data Flow — Charging Session

```
1. User selects port and credit amount in kiosk web
2. POST /api/charging/start → checks port availability + credit balance
   → deducts credits (spendCredits) → creates ChargingSession (status: active)
   → queues `activate_port` command with duration_seconds
3. ESP32 polls commands → activates SSR relay on selected port
4. Auto-expiry: every telemetry POST checks elapsed time vs durationSeconds
   → on expiry: session marked completed, `deactivate_port` queued
5. User can stop early: POST /api/charging/stop/:id
   → marks status: interrupted, queues `deactivate_port`
```

---

## Real-Time (SSE)

| Endpoint | Consumer | Events |
|---|---|---|
| `GET /api/kiosk/:id/sse` | Kiosk web | `ports` (relay state, voltage/current), `bottleInBin` |
| `GET /api/admin/sse` | Admin console | `telemetry` (all sensor data), `overview` (aggregate stats) |

- Both endpoints require authentication via `?token=` query param
- Telemetry POST from ESP32 triggers both broadcasts on every ping
- SSE connect/disconnect events logged to console

---

## Server Logging

All server endpoints emit structured console logs visible in Render log viewer:

| Prefix | Covers |
|---|---|
| `[Auth]` | Login attempt/success/fail (with reason), register, refresh |
| `[Device]` | Telemetry (FSM state, bin%, ports, bottle events), command poll, ACK |
| `[Kiosk]` | Session create/end, deposit, bottle approve/reject, QR link/status, SSE connect |
| `[Charging]` | Session start (credits, duration, wattage), stop (interrupted), port commands |
| `[Admin]` | Overview fetch, settings update, SSE connect/disconnect |
| `[CORS]` | Blocked origins (shows which URL is missing from allowlist) |
| `[Error]` | All unhandled errors with HTTP status + stack trace for 500s |

---

## AI Health Monitoring

- Kiosk web polls `GET /api/health-ai` (Next.js proxy route) every **60 seconds**
- Proxy calls AI server `GET /health` with 5s timeout, no auth
- Console logs: `[AI Health] Ping sent →`, `[AI Health] Ping responded ← ONLINE/OFFLINE`
- Monitor starts on mount, stops on unmount

---

## Known Issues Resolved

| Issue | Root Cause | Fix Applied |
|---|---|---|
| 500 ENOENT routes-manifest.json | Turbopack + Windows junction (`C:\` → `D:\`) creates triple-path string | Removed `--turbopack` from dev scripts; added `outputFileTracingRoot` to `next.config.js` |
| CORS "Connection not Verified" | `origin: '*'` + `credentials: true` is spec-illegal — browsers reject ALL credentialed requests | Replaced with explicit `ALLOWED_ORIGINS` allowlist from env var |
| DATABASE_URL SSL broken | `ssl-ca` (hyphen) is ignored by mysql2 URL parser | Changed to `sslca` (no hyphen) |
| SSE auth broken | `requireAuth` only read `Authorization` header; `EventSource` cannot set headers | Middleware now also reads `?token=` query param |
| Admin JWT XSS risk | `localStorage` persists tokens — accessible to any XSS script indefinitely | Changed to `sessionStorage` (clears on tab close) |
| Kiosk animated BG overlapping content | `min-h-screen` inside `minHeight:100vh` parent causes double-stacking | Replaced with `flex:1` height chain; removed animated backgrounds and falling leaves |
| No admin route protection | No `middleware.ts`; `/dashboard` accessible without login | Added Next.js edge middleware guarding `/dashboard/**` via session cookie |
| Non-admin users accessing admin | Login page never checked `is_admin` | Added `is_admin` check; non-admins shown "Access denied" |
| No admin logout | AdminSidebar had no logout button | Added Sign Out button that clears sessionStorage + cookie + redirects to `/login` |
| Timing attack on device key | `===` string comparison leaks timing info | `crypto.timingSafeEqual` with length pre-check |

---

## Active Issues

| Issue | Status |
|---|---|
| CORS error on deployed kiosk | `ALLOWED_ORIGINS` set but API service may need **manual redeploy** on Render |
| Admin console URL missing from `ALLOWED_ORIGINS` | Add console Render URL once deployed |
| Cloudflare Tunnel quick tunnel URL changes on restart | Set up a **named tunnel** (`cloudflared tunnel create ecocharge`) |
| `npx prisma migrate deploy` not yet run on Render | Run once after first deploy to apply all migrations |
| `AI_KEY` in `kiosk_web/.env.local` may be placeholder | Update with actual AI server key |

---

## Environment Variables

### API Server

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL + `sslca=certs/ca.pem` |
| `JWT_SECRET` | Yes | Strong random string |
| `JWT_EXPIRES_IN` | Yes | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Yes | e.g. `7d` |
| `DEVICE_API_KEY` | Yes | Must match ESP32 firmware |
| `ALLOWED_ORIGINS` | Yes | Comma-separated frontend URLs |
| `PORT` | No | Default 3000 |

### Kiosk Web

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | API server base URL |
| `NEXT_PUBLIC_KIOSK_ID` | Yes | Kiosk ID for this device |
| `AI_URL` | Yes | AI server base URL (server-side only) |
| `AI_KEY` | Yes | AI server API key (server-side only) |

### Admin Console

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | API server base URL |

---

## Deployment Checklist (Render)

- [ ] Set `ALLOWED_ORIGINS` to include ALL deployed frontend URLs
- [ ] Trigger manual redeploy of API after env var changes
- [ ] Set `DATABASE_URL` with `sslca=` (not `ssl-ca=`)
- [ ] Confirm `certs/ca.pem` is committed and not in `.gitignore`
- [ ] Run `npx prisma migrate deploy` after first deploy
- [ ] Set `DEVICE_API_KEY` matching ESP32 firmware
- [ ] Set `JWT_SECRET` to a strong random value
- [ ] Set up named Cloudflare tunnel (not quick tunnel)
- [ ] Update `NEXT_PUBLIC_API_URL` in kiosk web and admin console to actual Render API URL
- [ ] Add admin console Render URL to `ALLOWED_ORIGINS` once deployed

---

## Directory Structure

```
EcoCharge/
├── client/
│   ├── flutter_app/       # Flutter mobile companion app
│   ├── kiosk_web/         # Next.js 15 kiosk touchscreen UI
│   └── web_console/       # Next.js 15 admin dashboard
├── esp/
│   └── ecocharge/         # ESP32 FreeRTOS firmware (ESP-IDF 5.5)
├── server/
│   ├── server_main/       # Node.js API (Express + Prisma + MySQL)
│   └── server_AI/         # FastAPI AI inference (YOLOv8 + CNN)
├── runs/
│   ├── classifier/        # Trained CNN checkpoints
│   └── detect/            # YOLO training outputs
└── scripts/
    └── dataset/           # Annotated bottle dataset (Roboflow)
```
