# EcoCharge — System Analysis

**Last verified against code:** 2026-07-22 (branch `main`)

> **Status note, 2026-08-11 — per this document's own re-run policy in `docs/planning/01-audit-prompt.md` ("don't re-run reflexively; `docs/planning/11-audit-findings.md` already carries forward more recent, narrower findings"), this is a targeted correction of the specific claims below now known stale, not a full re-audit.** `docs/planning/08-master-checklist.md` is the live, currently-accurate tracker — treat it as authoritative over this document for current status. Known-stale sections, checked against real current state this session:
> - **§2 component table**: Kiosk Web and Admin Console are no longer HeroUI — HeroUI was dropped entirely 2026-08-10/11 (Mantine on the Admin Console, shadcn/ui on Kiosk Web). A fourth surface, the public Website (`client/web`), now also exists (scaffolded 2026-08-10) and isn't listed here at all.
> - **§3 architecture diagram / §15 deployment table**: describe Render + Aiven MySQL + Supabase Storage — **all decommissioned as of 2026-08-11.** The real, live topology is Docker MySQL + Node API + admin console + AI server all self-hosted on `desktop-gklhcri`, each on its own public Cloudflare quick tunnel, media on local disk. See `docs/evidence/architecture-diagram.md` for the current real topology diagram.
> - **§5 known security gaps**: "Kiosk read endpoints are unauthenticated" is **fixed** (2026-08-10, `requireAuth` added). "`.env` files with live credentials exist in the tree" was already corrected by `docs/planning/11-audit-findings.md` itself — verified false, only the firmware `config.h` carries live secrets, no `.env` was ever tracked.
> - **§14 environment variables**: `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`/`SUPABASE_BUCKET` no longer exist — removed along with the Supabase decommission. Avatar upload now writes to local disk (`MEDIA_STORAGE_PATH`), not Supabase.
>
> Everything else below (data model, FSMs, API inventory, hardware map) was not independently re-verified this session and is assumed still substantially accurate absent evidence otherwise — a full re-run per `01-audit-prompt.md`'s methodology is the right move if a future session needs to trust this document at a glance again, rather than patching it further piecemeal.

Every claim in this document was checked against the actual source. Stale documentation from earlier revisions has been removed.

---

## 1. What Is EcoCharge?

**EcoCharge** is an IoT-integrated reverse-vending kiosk system (2026 thesis project). It incentivizes plastic bottle recycling by rewarding users with **phone-charging credits**:

1. A user walks up to the kiosk and authenticates on the touchscreen — either by scanning a QR code with the EcoCharge mobile app, or by tapping **Continue as Guest**.
2. They place a PET bottle on the conveyor entrance. An ultrasonic sensor detects it, the conveyor nudges it under a camera, and an AI vision pipeline (YOLO detector + CNN classifier) identifies the bottle's brand, volume, and condition.
3. If accepted, the conveyor drops the bottle into the bin; bin sensors confirm the drop and the server awards credits (1–3 per bottle, by volume tier).
4. The user spends credits to charge their phone at one of **4 AC charging ports**, each switched by a relay and monitored for voltage/current.

**Why it exists:** to close the loop between plastic waste collection and a tangible, immediately useful reward (phone charging), in a self-contained kiosk suitable for public deployment in the Philippines.

---

## 2. Components (all present and functional in the repo)

| Component | Path | Stack | Role |
|---|---|---|---|
| **API Server** | `server/server_main/src/` | Node.js + Express + TypeScript + Prisma | Central backend: auth, sessions, deposits, credits, charging, device commands, SSE, admin |
| **AI Server** | `server/server_AI/` | Python + FastAPI + PyTorch/Ultralytics | Two-stage bottle detection & classification |
| **Kiosk Web** | `client/kiosk_web/` | Next.js 15 + HeroUI + Tailwind | Touchscreen UI on the kiosk (camera capture, deposit flow, charging flow) |
| **Admin Console** | `client/web_console/` | Next.js 15 + HeroUI + Recharts | Admin dashboard: live telemetry, CRUD, analytics, remote control |
| **Mobile App** | `client/flutter_app/` | Flutter (Dart SDK ^3.9) | Companion app: register/login, QR-link to kiosk, balances, history, stop charging |
| **Kiosk Firmware** | `esp/ecocharge/` | ESP32, ESP-IDF via PlatformIO, FreeRTOS (v2.0.0) | Conveyor, relays, sensors, bottle FSM, WiFi provisioning portal |
| **Sensor Bridge** | `esp/pico_sensors/` | Raspberry Pi Pico, Arduino core | Extra ADC channels the ESP32 lacks, streamed over UART |
| **Training scripts** | `scripts/` | Python (Ultralytics, PyTorch) | `train_yolo.py`, `train_bottle_classifier.py`, dataset tooling; outputs in `runs/` |

> **Legacy code still in the tree (not used at runtime):**
> - `server/server_main/app/` — an abandoned Python/Flask prototype of the backend. The live server is the TypeScript one in `src/`.
> - `client/flutter_app/lib/models/mock_data.dart` — early mock data; all screens now call the real API via `ApiService`.
> - `POST /api/kiosk/deposits` — legacy instant-deposit endpoint, kept for backward compatibility; the kiosk uses the FSM flow (`/bottle/approve` + bin confirmation) instead.

---

## 3. Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                 │
│  Flutter App (mobile)   Kiosk Web (Next.js)    Admin Console      │
│  - login/register       - idle → auth → session  (Next.js)        │
│  - scan kiosk QR        - camera → AI detect     - live dashboard │
│  - credits / history    - deposit FSM UI         - kiosk CRUD +   │
│  - stop charging        - charging flow            remote control │
└──────────┬────────────────────┬──────────────────────┬────────────┘
           │ REST               │ REST + SSE           │ REST + SSE
           ▼                    ▼                      ▼
┌───────────────────────────────────────────────────────────────────┐
│           Node.js API Server (Express + Prisma, on Render)        │
│  /api/auth /api/users /api/kiosk /api/charging /api/devices       │
│  /api/admin /health /api/log/ai-error                             │
│         MySQL 8 (Docker, self-hosted on desktop-gklhcri)          │
│      Local disk MEDIA_STORAGE_PATH, served at /media (avatars)    │
└──────┬─────────────────────────────────────────────┬──────────────┘
       │ (kiosk web proxies /api/detect)             │ HTTPS poll every 2–5 s
       ▼                                             ▼
  AI Server (FastAPI)                          ESP32 Kiosk (FreeRTOS)
  YOLO26 detector → EfficientNet-B0            conveyor (L298N), 4 relays,
  multi-head classifier                        3× HC-SR04 ultrasonic,
  X-Api-Key auth                               analog V/I sensing,
  local PC + Cloudflare Tunnel,                Pico ADC bridge (UART),
  or Docker/RunPod                             WiFi provisioning portal
```

Key design point: the **ESP32 never receives inbound connections** from the cloud. It polls `GET /api/devices/commands` every 2 s and posts telemetry every 5 s, so it works behind NAT with no port forwarding. The kiosk browser talks to the AI server only through the Next.js server-side proxy (`/api/detect`), so the AI key never reaches the client.

---

## 4. Data Model (Prisma / MySQL)

`server/server_main/prisma/schema.prisma`:

- **User** — email/password (bcrypt), unique `qr_code`, `credit_balance`, `is_admin`, optional avatar URL (local disk, served from `/media/avatars/`).
- **Kiosk** — name, location, **unique `api_key`** (device auth), `status` (online/offline/error), `last_seen_at`.
- **KioskSession** — a user's visit at a kiosk (`sessions` table).
- **BottleDeposit** — brand/volume/condition/confidence from AI, `credits_awarded`, `status`: `pending_bin` → `confirmed` | `rejected`.
- **CreditTransaction** — EARN/SPEND ledger with `balance_after` and reference (`bottle_deposit` / `charging_session`).
- **ChargingSession** — port, credits used, computed `duration_seconds`, `watt_snapshot`, `status`: `active` / `completed` / `interrupted` / `error`.
- **DeviceCommand** — queued commands for the ESP32; `status`: `PENDING` / `ACKED` / `FAILED` / `EXPIRED`.
- **DeviceTelemetry** — port JSON blob + bin level, timestamped.
- **SystemSetting** — key/value store for tunable economics (see §8).

Migrations live in `prisma/migrations/` and are **auto-applied at server startup** (`src/startup.ts` runs `prisma migrate deploy` with self-healing for P3009/P3018 failure states). There is no manual migration step on Render.

---

## 5. Authentication & Security (as implemented)

| Actor | Mechanism | Where |
|---|---|---|
| User / Admin | JWT HS256 access token (default 4 h) + refresh token (default 30 d) via `/api/auth/login`, `/api/auth/refresh` | `src/routes/auth.ts` |
| Guest kiosk user | `POST /api/auth/guest` issues a 4 h JWT for a shared `guest@kiosk.local` account and opens a KioskSession — the whole deposit flow works without registration | `src/routes/auth.ts` |
| ESP32 device | **Per-kiosk API key** stored in the `kiosks` table, sent as Bearer token; `requireDeviceKey` looks it up in the DB | `src/middleware/deviceAuth.ts` |
| Admin console | JWT in `sessionStorage` + value-less `admin_authed=1` cookie (SameSite=Strict); Next.js edge middleware gates `/dashboard/**` on the cookie; login page rejects non-`is_admin` accounts | `web_console/middleware.ts`, `lib/api.ts` |

- `requireAuth` accepts the token from the `Authorization` header **or** `?token=` query param (needed because `EventSource` cannot set headers).
- `requireAdmin` = `requireAuth` + `isAdmin` claim check.
- **CORS**: explicit `ALLOWED_ORIGINS` allowlist parsed from env at startup; rejected origins are logged with a `[CORS]` prefix. (Wildcard origin + credentials is spec-illegal and is not used.)
- **Transport**: **corrected 2026-08-12** — this described Aiven MySQL over TLS with a CA cert at `server/server_main/app/certs/ca.pem`, a path that no longer exists (the real leftover cert is at `server/server_main/certs/ca.pem`, now unused). The live database is Docker MySQL on `desktop-gklhcri`, reached over loopback at `127.0.0.1:13306` — no TLS CA and no `sslca=` parameter is involved. Local dev against it needs an SSH tunnel (see `docs/planning/08-master-checklist.md` Phase A).
- AI server: `X-Api-Key` header auth (with `Authorization: Bearer` fallback), because Cloudflare tunnels can strip `Authorization` on multipart bodies.

### Known security gaps (verified in code, worth fixing before defense)

- **Kiosk read endpoints are unauthenticated**: `GET /api/kiosk/list`, `/:id/ports`, `/:id/sse`, and `/qr-status` require no token (the kiosk client sends `?token=` on SSE, but the server route never checks it).
- **Secrets are committed to git**: the ESP32 `include/config.h` hardcodes the Render URL, device API key, and AI API key; `.env` files with live credentials exist in the tree.
- Guest deposits accrue credits to a single pooled guest account (by design, but the balance is shared across all guests).
- Device key comparison is a DB lookup, not a constant-time compare (the old `timingSafeEqual` static-key scheme was replaced by per-kiosk DB keys).

---

## 6. The Bottle Deposit Flow (FSM, end to end)

The ESP32 runs a five-state bottle FSM (`esp/ecocharge/src/bottle_fsm.c`):
`IDLE → SCANNING → DROPPING → CONFIRMING → (IDLE)` with a `REJECTING` branch (conveyor reverses until the entrance clears).

```
 1. Kiosk idle screen → user taps → /auth: shows QR (or "Continue as Guest")
 2a. QR path: phone app scans QR {kioskId, sessionToken} → POST /api/kiosk/qr-link
     Kiosk polls GET /api/kiosk/qr-status?token=… every 2 s → receives JWT +
     session_id when linked (pending map entry, 5 min TTL, single-use)
 2b. Guest path: POST /api/auth/guest → 4 h JWT + fresh session
 3. User places bottle → entrance ultrasonic (< 15 cm) → FSM enters SCANNING,
    conveyor nudges the bottle every 2 s for fresh camera angles
 4. Kiosk web captures a camera frame (getUserMedia → canvas → JPEG blob)
    → POST /api/detect (Next.js proxy) → AI server /api/detect
    → { detected, confidence, brand, volume_ml, condition, … }
 5. Accept: POST /api/kiosk/bottle/approve → BottleDeposit(status=pending_bin),
    server queues approve_bottle command
    Reject: POST /api/kiosk/bottle/reject → queues reject_bottle → conveyor reverses
 6. ESP32 polls commands → approve_bottle → DROPPING (conveyor fast-forward)
    → CONFIRMING (waits ≤ 8 s for a bin ultrasonic hit)
 7. ESP32 posts telemetry with bottle_in_bin=true
    → server marks deposit confirmed, awards credits, writes EARN transaction,
      broadcasts SSE {type:"bottleInBin", confirmed:true, credits_awarded}
 8. Timeout path: telemetry arrives with fsm_state=confirming, bottle_in_bin=false
    → deposit marked rejected, credits zeroed, SSE confirmed:false
 9. Kiosk UI (session/bin page) shows the result; receipts at /receipt/credit
```

Credits per bottle come from **SystemSettings tiers**: ≤ 350 mL → 1 credit, ≤ 500 mL → 2, larger → 3 (all editable from the admin console).

---

## 7. The Charging Flow

```
1. Kiosk: user picks a port and credit amount → POST /api/charging/start
2. Server checks: port not already active (409), balance sufficient (400)
3. Duration = credits × energy_budget_wh_per_credit (5 Wh) ÷ measured port watts
   (from latest telemetry snapshot); if no live V/I reading, falls back to
   credits × base_minutes_per_credit (10 min). Hard cap: max_charging_seconds (3600).
4. Credits deducted (SPEND transaction), ChargingSession(active) created,
   activate_port command queued with duration_seconds
5. ESP32 switches the port relay (active-low) — a safety task enforces a
   3600 s max relay-on watchdog independently of the server
6. Auto-expiry: on every telemetry POST the server checks elapsed vs duration
   → marks completed + queues deactivate_port
7. Early stop: POST /api/charging/stop/:id (from kiosk or phone app)
   → status interrupted + deactivate_port
```

---

## 8. API Server — Full Endpoint Inventory

All verified in `server/server_main/src/routes/`.

**Public / misc**
- `GET /health` — liveness ping (also used by ESP32 to keep Render awake)
- `POST /api/log/ai-error` — kiosk web relays AI failures here so they show up in Render logs

**Auth** (`/api/auth`): `POST /login`, `POST /register`, `POST /guest`, `POST /refresh`

**Users** (`/api/users`, JWT): `GET /me`, `GET /me/credits`, `GET /me/deposits`, `GET /me/transactions`, `POST /me/avatar` (multer memory storage → written to `MEDIA_STORAGE_PATH/avatars/`, served back by `express.static` at `/media`; returns an absolute URL on the API origin — **corrected 2026-08-12**, this previously described a Supabase Storage bucket that no longer exists)

**Kiosk** (`/api/kiosk`): `POST /sessions`, `DELETE /sessions/:id`, `POST /deposits` (legacy), `POST /bottle/approve`, `POST /bottle/reject`, `POST /qr-link`, `GET /qr-status`, `GET /list`, `GET /:id/ports`, `GET /:id/sse`

**Charging** (`/api/charging`, JWT): `POST /start`, `POST /stop/:id`, `GET /active`

**Devices** (`/api/devices`, per-kiosk API key; every call marks the kiosk online):
- `GET /commands` — pending commands, max 5 per poll; PENDING commands older than **5 minutes are auto-expired** so a rebooted ESP is never flooded with stale test commands
- `POST /commands/:id/ack`
- `POST /telemetry` — ports V/I/relay, bin %, ultrasonic distances, `bottle_at_entrance`, `bottle_in_bin`, `fsm_state`; drives deposit confirmation, charging auto-expiry, and both SSE broadcasts

**Admin** (`/api/admin`, admin JWT):
- `GET /overview`, `GET /sse` (live overview + telemetry stream)
- Kiosks: `GET /kiosks`, `POST /kiosks` (generates the device API key), `PUT /kiosks/:id`, `DELETE /kiosks/:id`, `GET /kiosks/:id/telemetry/latest`
- Remote control: `POST /kiosks/:id/command` (activate/deactivate_port, open/close/reverse_conveyor, approve/reject_bottle, ping), `GET /kiosks/:id/commands` (audit log), `DELETE /kiosks/:id/commands/pending` (cancel stale)
- Data: `GET /sessions`, `GET /deposits`, `GET /charging`, `GET /transactions`, `GET /users` (paginated where large)
- `GET /alerts` — kiosk offline > 2 min, bin ≥ 80 % (critical ≥ 95 %)
- `GET /ml-review` — deposits with AI confidence below a threshold (default 0.70)
- `GET /analytics?days=N` — daily kWh consumed, credits issued, cost/gain in PHP (uses `electricity_rate_php_per_kwh`)
- `GET|PUT /settings` — the SystemSetting key/value store

**Settings defaults** (`settingsService.ts`, 30 s cache): credit tiers (350 mL/1, 500 mL/2, else 3), `energy_budget_wh_per_credit=5`, `base_minutes_per_credit=10`, `max_charging_seconds=3600`, `electricity_rate_php_per_kwh=11.0`.

**Real-time (SSE)** — `sseService.ts` keeps in-memory client lists:
- `GET /api/kiosk/:id/sse` → `ports` events (per-port availability, V/I/W, remaining seconds, FSM state) + `bottleInBin` confirmations
- `GET /api/admin/sse` → `overview` snapshot on connect, then `telemetry` on every device POST

**Structured logging** — every subsystem logs with a prefix (`[Auth]`, `[Device]`, `[Kiosk]`, `[Charging]`, `[Admin]`, `[CORS]`, `[AI]`, `[Migration]`, `[Request]`), designed to be self-contained in the Render log viewer. At startup the server also runs a two-step AI reachability + key check (`pingAIServer`).

---

## 9. Kiosk Web (`client/kiosk_web`)

Next.js 15 App Router, HeroUI, framer-motion; state kept in `sessionStorage` (token/session/user).

**Pages:** `/` (idle/attract screen) → `/auth` (QR code + guest button, 2 s QR-status polling) → `/auth/linking`, `/auth/linked` → `/session` (menu) → `/session/deposit` (live camera via `getUserMedia`, frame capture to JPEG, AI call, approve/reject) → `/session/bin` (waits for SSE bin confirmation) → `/session/credits`, `/session/charging` (port grid from SSE, start/stop) → `/session/result`, `/receipt/charge`, `/receipt/credit`, plus `/diag` (diagnostics).

**Server-side proxy routes** (secrets stay server-side):
- `POST /api/detect` — streams the multipart body through to `AI_URL/api/detect` with `X-Api-Key`, 12 s timeout; failures are relayed to the backend's `/api/log/ai-error`
- `GET /api/health-ai` — AI health poll used by `useAiHealth` (every 60 s)
- `GET /api/health-backend` — backend health

On any 401 the API helper clears the session and redirects to `/auth`. `next.config.js` sets `outputFileTracingRoot` (Windows junction workaround); dev scripts do **not** use Turbopack.

---

## 10. Admin Console (`client/web_console`)

Next.js 15, HeroUI, Recharts. Auth flow described in §5.

**Dashboard pages** (all under `/dashboard`, cookie-gated by edge middleware): overview (live SSE stats), **kiosks** (CRUD, shows device API key) and **kiosk detail** (live telemetry, relay/conveyor/bottle remote controls, command audit log, cancel-pending), sessions, deposits, charging, credits (transaction ledger), users, **alerts**, **ml-review** (low-confidence deposits), **analytics** (kWh/credits/cost charts), settings (edit the SystemSetting economics).

---

## 11. ESP32 Firmware (`esp/ecocharge`, v2.0.0)

PlatformIO project, `framework = espidf`, target `esp32dev`, huge_app partition (4 MB flash).

**Hardware map** (`include/config.h`):
- **Conveyor:** L298N H-bridge — IN1=19, IN2=23, ENA=18 (LEDC PWM 1 kHz)
- **Relays:** 4 charging ports on GPIO 25/26/16/5, active-low, 3600 s max-on watchdog
- **Ultrasonic (HC-SR04 ×3):** entrance (13/36), bin-top (14/39), bin-bottom (15/21); entrance threshold 15 cm, bin 20 cm; 5 V→3.3 V dividers on ECHO
- **Power sensing:** SW1/SW3 current+voltage on ESP32 ADC1 (GPIO 33/35/32/34); SW4 current on ADC2 GPIO12 (unavailable while WiFi is up); **SW2 V/I and SW4 V come from the Pico** over UART2 (RX=17, TX=4, 115200)
- **Status LED** GPIO27 with distinct blink patterns per state

**FreeRTOS tasks** (priority): safety/watchdog (10), command poll (7), bottle FSM (6), httpd (5), sensors (4), telemetry (3).

**WiFi provisioning:** credentials in NVS; if none (or connect fails) the ESP starts an AP `EcoCharge_Config` with a **captive portal** (`/generate_204` etc. redirects) serving a provisioning page with WiFi scan + signal strength UI. In station mode the same embedded web server (`web_server.c`) exposes a local test dashboard: `/` (status), `/test` (manual controls), `/api/status`, `/api/sse`, conveyor forward/reverse/stop/speed, relay on/off/all-off, `/api/wifi/scan`, `/api/selftest`, `/api/reboot`. A **hardware self-test** (`self_test.c`) exercises the Pico UART, motor, and sensors at boot.

**Cloud loop:** poll commands every 2 s, POST telemetry every 5 s, `/health` ping every 4 min to keep the free Render instance awake.

## Pico Sensor Bridge (`esp/pico_sensors`)

Raspberry Pi Pico (Arduino/earlephilhower core). Reads three 12-bit ADC channels — SW2 voltage (GP26), SW2 current (GP27), SW4 voltage (GP28) — and prints `SW2V,SW2I,SW4V\n` raw values over UART0 to the ESP32 every 500 ms. The ESP32 applies calibration formulas. Exists because the ESP32 runs out of usable ADC pins once WiFi claims ADC2.

---

## 12. AI Server (`server/server_AI`)

FastAPI app (`app/main.py`) with request logging and `X-Api-Key` auth.

- `GET /health` — no auth, used by kiosk health poll and backend startup check
- `POST /api/detect` — multipart image → JSON

**Two-stage pipeline** (`app/inference.py`):
1. **YOLO26 detector** (`models/best_detector.pt`, conf threshold 0.40, env-overridable) finds the bottle; highest-confidence box wins.
2. Crop (+5 px pad) → **`BottleAttributeNet`**: EfficientNet-B0 backbone with three heads — **brand**, **volume_ml**, **condition** (perfect/imperfect) — each with softmax confidence. Label maps ship inside the checkpoint (`models/best_classifier.pt`).

Response: `{detected, confidence, bounding_box, brand, brand_confidence, volume_ml, volume_confidence, condition, condition_confidence}`.

**Hosting:** runs on a local PC (`start.bat`, `.venv`) exposed through a Cloudflare Tunnel, or as a Docker container (Dockerfile targets RunPod). GPU used when available, CPU fallback. Quick tunnels get a new URL on every restart — `AI_URL`/`AI_SERVER_URL` env values must be updated, or a named tunnel set up (`cloudflared tunnel create ecocharge`).

**Training** (`scripts/`, see `docs/planning/12-self-hosting-guide.md` for the full guide): Roboflow-annotated dataset in `scripts/dataset/`, `train_yolo.py` and `train_bottle_classifier.py`, outputs in `runs/detect/` and `runs/classifier/`.

---

## 13. Mobile App (`client/flutter_app`)

Flutter app talking to the real API (`ApiService`, base URL via `--dart-define=API_BASE_URL`, default `https://ecocharge-api.onrender.com`). Token persisted with `shared_preferences`.

**Screens:** splash/onboarding → login/register → home (balance, recent activity, kiosk list) → **scan kiosk QR** (`mobile_scanner`; parses the kiosk's QR and calls `POST /api/kiosk/qr-link`) → credit balance + transactions, deposit history, charging (view/stop active session), profile (avatar upload, logout).

---

## 14. Environment Variables

### API Server (`src/config.ts`, zod-validated with defaults)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | **Yes** (only var with no default) | MySQL URL ending `?sslca=certs/ca.pem` |
| `JWT_SECRET` | Prod | default `dev-jwt-secret` |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | No | defaults `4h` / `30d` |
| `ALLOWED_ORIGINS` | Prod | comma-separated frontend URLs; **redeploy API after changing** |
| `AI_SERVER_URL`, `AI_API_KEY` | No | used only for the startup AI health/auth check |
| `MEDIA_STORAGE_PATH` | For avatars | local media root (default `D:\EcoCharge\media` in production); avatar upload fails if unwritable. **Replaced the former `SUPABASE_*` trio, removed 2026-08-11.** |
| `PORT` | No | default 3001 |

Note: `DEVICE_API_KEY` still appears in `config.ts` but is **unused** — device auth is the per-kiosk key stored in the `kiosks` table (generated by admin kiosk creation).

### Kiosk Web
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_KIOSK_ID`, `AI_URL` (server-side), `AI_KEY` (server-side).

### Admin Console
`NEXT_PUBLIC_API_URL`.

### ESP32
No env — `RENDER_BASE_URL`, `DEVICE_API_KEY`, `KIOSK_ID`, `AI_SERVER_URL`, `AI_API_KEY`, WiFi fallbacks are compile-time defines in `include/config.h`; WiFi credentials are set at runtime via the provisioning portal (NVS).

---

## 15. Deployment Picture & Open Issues

| Service | Hosting |
|---|---|
| API server | Render (Node), auto-migrates on boot |
| Kiosk web / Admin console | Render (Next.js) |
| MySQL | Docker container on `desktop-gklhcri`, port 13306 (self-hosted) |
| AI server | Local PC + Cloudflare Tunnel (or Docker/RunPod) |
| Avatar storage | Local disk on the API host (`MEDIA_STORAGE_PATH`), served at `/media` |

**Currently observable issues (as of 2026-07-22):**

1. **Inconsistent backend URLs across clients** — the firmware points at `ecocharge-server-j7u7.onrender.com`, the kiosk web `.env.local` at `ecocharge-server.onrender.com`, and the Flutter default + console at `ecocharge-api.onrender.com`. At most one of these is the live service; the others will fail. Align all four.
2. **Quick-tunnel AI URLs** (`*.trycloudflare.com`) rotate on every restart; kiosk `.env.local` and firmware `config.h` each embed one. Use a named Cloudflare tunnel.
3. **Secrets committed to git** — firmware `config.h` (device + AI keys), `.env` files with live DB credentials. Rotate and move to untracked config before publishing the repo.
4. **Unauthenticated kiosk read endpoints** (see §5).
5. **Legacy Flask `server_main/app/` tree** and `dist/` build output are still committed — dead weight, candidates for deletion.
