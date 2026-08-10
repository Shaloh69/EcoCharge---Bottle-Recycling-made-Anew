# EcoCharge — Full Revamp Master Prompt

Single source of truth for the rework. Give this file, alongside `analyzation.md` and `AUDIT.md`, to Claude Code. Use `docs/planning/00-start-here.md` as the actual chat message to kick things off.

**Provenance note:** this file consolidates two documents that previously lived as untracked files at the repo root — `ECOCHARGE_FULL_REWORK_PROMPT.md` and `ECOCHARGE_KIOSK_HARDWARE_CLARIFICATIONS.md` (an addendum that corrected a location assumption, gave precise hardware context, and resolved several open items). Both have been deleted from the root now that their content lives here; see `memory.md`'s 2026-08-10 entry for why. Nothing below is new content — it's the same material, merged and with status corrected against what was actually verified in code on 2026-08-10.

---

## 0. Ground truth

`analyzation.md` (verified 2026-07-22, methodology in `01-audit-prompt.md`) is the primary source of truth for what exists in this repo. `AUDIT.md` is a later, narrower pass — it found and mostly fixed five specific issues `analyzation.md` flagged, ran the process audit in §3 below, and proposed exact values for two firmware fixes that are **still awaiting explicit user sign-off before anything gets flashed** (see §3.2/§3.3 and `memory.md`).

**What EcoCharge is:** a reverse-vending kiosk. A user deposits a PET bottle, an ESP32-driven conveyor and a two-stage AI pipeline (YOLO26 detector → EfficientNet-B0 classifier) identify and grade it, credits are awarded by volume tier, and those credits pay for phone charging at one of 4 relay-switched AC ports. Currently hosted on Render (API + both Next.js apps), Aiven MySQL, Supabase Storage (avatars), and a local PC running the AI server behind a rotating Cloudflare quick-tunnel.

**Status, verified against real code 2026-08-10 — read this before assuming any section below is done:**
- §2's five fixes: **four done** (URL consistency is still pending, tied to the migration below), key rotation still outstanding.
- §3's six process-audit questions: all six answered/resolved except the `ml-review` gate question (§3.1), which is still genuinely open — a product decision, not a code question.
- §4 component inventory: **done**, both Next.js apps Knip-clean, no duplicate nav components found.
- §5–§7 design revamp: **not started visually** — tokens exist (`DESIGN.md`, full spec in `02-design-mandate.md`), nothing has been rebuilt against them yet (verified via dependency grep: no font/animation-library additions on any of the three surfaces).
- **§1 self-hosting migration: target machine confirmed, execution not started.** `server/server_main/.env` still points at Aiven, Supabase is still the avatar store, `ALLOWED_ORIGINS` still lists `*.onrender.com`, and the AI server is still on a rotating `*.trycloudflare.com` URL — none of that has changed yet. **What did change (2026-08-10): the target machine is confirmed as `desktop-gklhcri`**, per the user directly, corroborated by the Tailscale admin console — a distinct online Windows device from the dev machine (`minniedumpor`), registered under its own dedicated `ecocharge123@gmail.com` account. The architecture for this migration also changed from the original plan — see §1 below: MySQL and Supabase both run **containerized via Docker** on `desktop-gklhcri`, storage lives on **Disk D** (more free space than C:), and **Supabase is self-hosted, not dropped** — a change from the earlier "replace Supabase with raw local disk" plan.

---

## 1. Self-hosting migration — moving everything onto `desktop-gklhcri`

**Read this whole section before touching anything** — the single biggest risk here is treating this as a simple "move the files" task when it's actually a networking-topology change, because of one hard constraint below.

**Target machine: `desktop-gklhcri` — confirmed 2026-08-10, not an open question anymore.** Verified via the Tailscale admin console: two distinct Windows devices are online, `minniedumpor` (the day-to-day dev machine, `dumporshemjoshua@gmail.com`) and `desktop-gklhcri` (`ecocharge123@gmail.com` — a dedicated account, consistent with this being the intended standing server, not a shared personal machine). Everything server-side in this section — MySQL, the self-hosted Supabase stack, the Node API, both Next.js apps, the AI server — runs on `desktop-gklhcri`. Development/Claude Code work can still happen from `minniedumpor`, reaching `desktop-gklhcri` over the tailnet (SSH or remote commands), the same pattern used elsewhere in this project.

**Storage location: Disk D on `desktop-gklhcri`, not C.** D: has materially more free space than C: on that machine — every persistent volume this section creates (MySQL data, Supabase's Postgres + Storage objects, backups, logs) goes under a structured tree on D:, not scattered across C: and D:. See the **folder management** subsection below for the exact layout — set it up before running any `docker compose up`, since Docker will happily create anonymous volumes on C: (the default Docker Desktop disk) if bind-mount paths aren't specified up front, and moving a populated volume after the fact is real, avoidable rework.

**Containerization: MySQL and Supabase both run in Docker, not native installs.** This is a change from the original version of this plan (which called for a native MySQL install and dropping Supabase entirely in favor of hand-built local storage). Reasoning below in §1.3/§1.4 — the short version: Docker gives clean, disk-relocatable, backup-friendly volumes for both, and self-hosting Supabase (rather than replacing it) means the app's existing Supabase-REST-API integration code barely has to change, just repoint at a different URL and a newly-generated key.

**Prerequisite: Docker Desktop on `desktop-gklhcri`.** Windows, so this means Docker Desktop with the WSL2 backend (not Hyper-V-only) — confirm WSL2 is enabled before installing Docker Desktop, since that's the more common source of a broken-looking install on Windows.

### 1.0 Folder management — the real layout on Disk D

Set this up before bringing any container up, not after. Everything self-hosted for EcoCharge lives under one root on D:, structured by service, so backups/updates/inspection never require hunting across the drive:

```
D:\EcoCharge\
├── mysql\
│   ├── data\                     ← MySQL's actual database files (Docker bind mount)
│   └── init\                     ← optional: one-time init SQL (e.g. CREATE DATABASE) run on first container start
├── supabase\
│   ├── docker\                   ← the vendored supabase/docker Compose project itself (git-cloned, not hand-written)
│   ├── .env                      ← self-hosted Supabase's own secrets (JWT secret, anon key, service-role key, Postgres password, dashboard login) — see §1.4, never committed
│   └── volumes\
│       ├── db\                   ← Supabase's *internal* Postgres data (its own auth/storage/realtime bookkeeping — not the app's MySQL data, see §1.4's note on why there are two databases)
│       └── storage\              ← the actual uploaded files (avatars) — this is the directory that matters for "where do the images really live"
├── backups\
│   ├── mysql\                    ← scheduled mysqldump output (§1.3)
│   └── supabase\                 ← scheduled pg_dump of Supabase's internal Postgres, so a bad upgrade doesn't lose bucket/object metadata
└── logs\
    ├── mysql\
    └── supabase\
```

Two rules that keep this from drifting once it's set up:
- **Every Docker Compose service's volume mounts point into this tree explicitly** (bind mounts to `D:\EcoCharge\...\`), never a bare named volume with no stated host path — a named volume with no bind mount is exactly how data quietly ends up on C: under Docker Desktop's own data root instead of D:.
- **Don't let this tree become a second copy of anything `server/server_main` itself owns.** This is *infrastructure* data (databases, object storage, container config) — application code, `.env` files for the Node API itself, and anything already tracked in git stays exactly where it is in the repo. Mixing the two is how a folder-structure decision quietly turns into a second, undocumented deployment location for actual code.

### 1.1 The constraint that shapes everything else: the ESP32 has no Tailscale client

The kiosk firmware polls a public HTTPS URL directly (`RENDER_BASE_URL`, compile-time constant) — it cannot join a tailnet, has no concept of MagicDNS, and in a real public deployment the physical kiosk very likely isn't even on the same network as the target server machine at all. The same is true for the Flutter mobile app once it's in an actual user's hands, and for the kiosk web app running in the kiosk's own browser. **Whatever replaces Render for the API server has to be reachable from the public internet, not just from inside the tailnet.**

**Confirmed separately (from the hardware-clarifications addendum): `client/kiosk_web` runs on its own dedicated PC, physically located at the kiosk itself, out in the field — it is not, and will not be, co-located with the server machine.** The server machine hosts the API, database, and AI service; the kiosk PC is a separate machine driving the touchscreen on whatever local network exists at the kiosk's physical location. This is *why* the Cloudflare Tunnel decision below is correct, not just consistent with it — `kiosk_web` needs a public path to the API server precisely because it's never on the same network as the server hardware.

**Re-check `client/kiosk_web`'s actual code with this in mind before migrating, specifically for anything that assumes co-location:**
- Any hardcoded `localhost` or local-network reference to the AI server, instead of going through `kiosk_web`'s own `/api/detect` server-side proxy route.
- Any assumption that `kiosk_web` can reach the ESP32 directly. Per `analyzation.md`, the ESP32 polls the *cloud API* for commands and posts telemetry there — it does not talk to `kiosk_web` directly. Confirm `kiosk_web`'s code doesn't assume otherwise anywhere (a leftover local-network call from an earlier development setup where everything really was on one machine/network would be a real bug, invisible until the API server actually moves).
- Confirm the kiosk PC's actual local network only needs to reach the ESP32 (whatever genuine local-network interaction actually exists — verify against code, don't assume) and the public internet. It should need nothing from the server machine's local network directly.

### 1.1a The kiosk PC needs Tailscale too — for remote admin, not for its runtime traffic

**Confirmed 2026-08-10: the kiosk PC does not have Tailscale set up yet.** This is a separate task from everything above — it doesn't change the runtime networking decision (the kiosk still reaches the API over the public Cloudflare Tunnel, precisely because §1.1 established it's never on the server's local network). Add it to the tailnet anyway, for the same reason `desktop-gklhcri` and `minniedumpor` are on it: **remote administration** — SSH access, log checks, pushing a `kiosk_web` update, checking on the machine without needing physical presence at the kiosk's field location. Two independent connections to the same machine, serving two different purposes — don't conflate them, and don't skip the Tailscale setup just because the Cloudflare Tunnel already covers the runtime path.

**Use Cloudflare Tunnel with a free domain for the public-facing pieces, not Tailscale Funnel.** The target machine staying on permanently is exactly the condition Cloudflare Tunnel is built for — `cloudflared` holds a persistent outbound-only connection to Cloudflare's edge.

**Getting a free domain to actually use:** Cloudflare Tunnel is free, but a *named* tunnel (the stable, non-rotating kind — required, since rotating `trycloudflare.com` quick-tunnel URLs are literally issue #2 below) needs a domain added to Cloudflare as a zone. **`dpdns.org`** is a current, legitimate free-subdomain registrar built specifically to pair with Cloudflare Tunnel — it allows full nameserver delegation to Cloudflare, which most free DNS providers don't permit.

**Setup sequence:**
1. Register a free subdomain at `dpdns.org` (e.g. `ecocharge.dpdns.org`).
2. Add it to Cloudflare as a new site/zone (free plan) and update the nameservers to Cloudflare's — allow up to 24 hours to propagate.
3. In the Cloudflare dashboard: **Zero Trust → Networks → Tunnels → Create a tunnel** (`cloudflared`), name it, and use the dashboard-issued token to run it:
```powershell
cloudflared service install <token-from-dashboard>
```
4. In **Public Hostnames**, route each service to its own subdomain (`api.ecocharge.dpdns.org` → `localhost:3001`, `kiosk.ecocharge.dpdns.org` → the kiosk web port, etc.) — one tunnel can front multiple hostnames across multiple services.
5. **Verify the origin isn't directly reachable outside the tunnel** — confirm the target machine's ports aren't also exposed some other way: `nc -zv <public-ip> 3001` from an outside network should fail.

**Sequencing implication, stated plainly: the unauthenticated-kiosk-endpoint fix from §2 already landed (2026-08-10) — good, that means this migration is no longer blocked behind it.** If picking this up fresh, still confirm it's actually deployed on whatever the server currently runs on before turning a public tunnel on.

### 1.2 What stays public (Cloudflare Tunnel) vs. what stays tailnet-only (Tailscale Serve)

| Service | Consumers | Exposure |
|---|---|---|
| **API server** | ESP32 kiosk (public internet), Flutter app (public internet), kiosk web (public, runs in-kiosk), admin console (team only) | **Cloudflare Tunnel** (public) — the ESP32/mobile requirement forces this even though the admin console alone wouldn't need it |
| **Kiosk web (Next.js)** | The physical kiosk's own browser, out in the field | **Cloudflare Tunnel** (public) |
| **Admin console (Next.js)** | Team only | **Tailscale Serve** (tailnet-only) — no reason to expose the internal ops dashboard publicly |
| **AI server (FastAPI)** | Called only by the API server's proxy route, never directly by clients | **Tailscale Serve** (tailnet-only) is enough if the AI server ends up on the same machine/tailnet |
| **MySQL (Dockerized)** | Only the API server | **Neither** — the container's port binds to `127.0.0.1` on `desktop-gklhcri` only (`ports: ["127.0.0.1:3306:3306"]` in the compose file, not a bare `3306:3306`), or at most tailnet-internal. Never expose a database through either tunnel. |
| **Self-hosted Supabase (Dockerized)** | Storage API needs to be reachable by end clients (mobile app, kiosk) for avatar URLs; every other Supabase service in the stack (Auth/GoTrue, Realtime, the Postgres port itself, Studio) has no external consumer — this app uses its own JWT auth, not Supabase Auth | **Recommended: keep the whole stack tailnet/localhost-only, and have the Node API proxy avatar reads through its own already-public hostname** (a small new route, not a raw Supabase URL handed to clients) — see §1.4. This keeps exactly one hostname public for this concern instead of adding a second, and avoids exposing Kong's other endpoints (Auth, Studio, the Postgres port) just because Storage needed to be reachable. |

**Optional extra layer for the admin console:** Cloudflare Access (same free Zero Trust plan) can gate a hostname behind SSO/email-OTP if it's ever put on the public tunnel later — not needed now given Tailscale Serve already handles this at zero extra cost.

### 1.3 MySQL — from Aiven to a Dockerized local instance on Disk D

**Run MySQL as a Docker container, not a native Windows install** — a `docker-compose.yml` service with an explicit bind mount to `D:\EcoCharge\mysql\data`, per §1.0's layout. This gets container-level isolation, an easy version pin (`mysql:8`, matching what Aiven ran), and a data directory that's trivially relocatable/backupable because it's just a folder on D:, not scattered across whatever Windows decided was the MySQL install's data path.

1. Author (or vendor) a `docker-compose.yml` under `D:\EcoCharge\` with a `mysql:8` service, environment-configured root password, and:
```yaml
services:
  mysql:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: <set via .env, never hardcoded in the compose file itself>
      MYSQL_DATABASE: ecocharge
    ports:
      - "127.0.0.1:3306:3306"   # never a bare 3306:3306 — see §1.2's exposure table
    volumes:
      - D:/EcoCharge/mysql/data:/var/lib/mysql
```
2. `docker compose up -d mysql`, confirm it's healthy (`docker compose logs mysql`, or `mysql -h 127.0.0.1 -u root -p` from the host).
3. Dump the existing Aiven database and restore it into the container:
```powershell
mysqldump -h <aiven-host> -u <user> -p --ssl-ca=certs/ca.pem ecocharge > ecocharge_backup.sql
docker exec -i <mysql-container-name> mysql -u root -p ecocharge < ecocharge_backup.sql
```
(On Windows, pipe redirection into `docker exec -i` from PowerShell works the same as any other stdin redirect — verify the container name via `docker ps` first if the compose project name isn't obvious.)
4. Update `DATABASE_URL` to point at `127.0.0.1:3306` (or `desktop-gklhcri`'s tailnet address if the Node API ever runs on a different machine than MySQL — it won't, per §1, but state the connection string as tailnet-safe anyway rather than assuming same-host always). TLS (`sslca=certs/ca.pem`) was required for Aiven specifically over the public internet — drop it for this connection, but the port binding in step 1 already keeps the database off the public internet regardless.
5. Confirm `prisma migrate deploy` still runs correctly against the Dockerized instance at server startup (the self-healing P3009/P3018 logic in `src/startup.ts` should work unchanged against any real MySQL 8 endpoint — verify, don't assume).
6. **Backup routine, adapted for the Docker + Disk D setup**: a scheduled task (Windows Task Scheduler, not a manually-remembered step) running `docker exec <container> mysqldump ...` on a cron-like interval, writing to `D:\EcoCharge\backups\mysql\` (per §1.0), with output additionally synced or copied off-machine — a backup that lives on the same physical disk as the database it's backing up doesn't protect against a disk failure, only against a bad migration or an accidental `DROP`. Aiven almost certainly had automated backups; this replaces that, and losing the only copy of the credits/transactions ledger is a real business risk once this is the system of record.

**Database migration credentials:** check first whether a local, untracked `.env` on whichever machine is doing the migration already has a working `DATABASE_URL` for Aiven (none are committed to git — verified — but an untracked local copy may exist from before). If one exists and still works, use it directly. If it doesn't, or has been rotated/revoked, ask the user for the current Aiven password explicitly rather than stalling silently.

### 1.4 Image storage — self-hosted Supabase via Docker, not a from-scratch rebuild

**Changed from the original plan.** The earlier version of this document called for dropping Supabase entirely and hand-building local disk storage + custom signed-URL Node routes. That's no longer the plan — **Supabase itself gets self-hosted on `desktop-gklhcri` via Docker**, and the app keeps talking to it the same way it already does (`storageService.ts` calling the Supabase REST API via axios), just repointed at a local URL instead of the cloud one. This is meaningfully less rework: the existing integration code, the `SUPABASE_BUCKET` concept, and the avatar-upload flow (`POST /me/avatar`, multer → Supabase) all stay structurally the same.

**Why self-host instead of rebuild:** the app's only real storage need is user avatars (`analyzation.md` §14 — `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`/`SUPABASE_BUCKET`, "For avatars," and that's the only Supabase-touching route in the whole API surface). Rebuilding a custom storage layer for a single-purpose avatar bucket is more code to write and maintain than pointing the existing, working integration at a self-hosted instance of the same product.

**Setup:**
1. Clone the official `supabase/docker` Compose project into `D:\EcoCharge\supabase\docker` (per §1.0's layout) — vendor it, don't hand-write a Supabase stack from scratch.
2. Copy its `.env.example` to `D:\EcoCharge\supabase\.env` and **generate fresh secrets — do not run with the example/demo values.** This means a new JWT secret, a new anon key, a new service-role key (derived from the JWT secret via Supabase's own key-generation process), and a real Postgres password. Leaving the example repo's demo keys in place on a self-hosted instance is a well-known real-world Supabase misconfiguration, not a hypothetical one.
3. Point every volume in the compose project at `D:\EcoCharge\supabase\volumes\...` (Postgres data, storage objects) via explicit bind mounts, same discipline as §1.3 — don't let this fall back to Docker's default C: data root.
4. `docker compose up -d` the stack. **Note explicitly, so this isn't confusing later: this stands up Supabase's *own* internal Postgres database** (used for its own Auth/Storage/Realtime bookkeeping) — **this is not, and does not replace, the app's MySQL database.** The two databases coexist for unrelated reasons: MySQL is EcoCharge's system of record via Prisma; Supabase's Postgres is private infrastructure Supabase itself needs to track object metadata, buckets, and (unused here) auth users. Don't let a future session try to "consolidate" them — they serve different owners.
5. Create the same bucket name currently configured in `SUPABASE_BUCKET` via Supabase Studio (bundled in the stack) or the Storage API directly.
6. **Update `server/server_main/.env`: `SUPABASE_URL` → the self-hosted instance's Kong gateway URL (`http://127.0.0.1:8000` if the Node API runs on the same machine, which it will), `SUPABASE_SERVICE_KEY` → the newly-generated service-role key from step 2.** Treat this exactly like the device/AI key rotation elsewhere in this document — a coordinated change, not something to do piecemeal, since the old cloud-Supabase key becomes meaningless the moment this switches over and there's no reason to leave a window where neither works.
7. **Exposure decision, recommended default:** keep the whole self-hosted Supabase stack tailnet/localhost-only (per §1.2's table) and add a small proxy route on the Node API (`GET /media/avatar/:userId` or similar) that fetches from the internal Supabase Storage URL server-side and streams it back, rather than handing clients a raw Supabase URL to fetch directly. This keeps only the API server's hostname public for this concern and avoids exposing Kong's other endpoints (Auth, Studio, the raw Postgres port) — small, deliberate code change, not a big rebuild. If that proxy route is judged not worth building right now, the fallback is exposing *only* a Storage-scoped hostname through the Cloudflare Tunnel (not the full Kong gateway) — acceptable, but a second public hostname for something the proxy route would have kept off the public internet entirely.

### 1.5 Persistence — two different mechanisms for two different kinds of service

**MySQL and Supabase are Docker containers — persistence is `restart: unless-stopped` in the compose file, not NSSM/PM2.** Docker Desktop itself needs "start on login/boot" enabled (its own setting), and each service's compose entry needs `restart: unless-stopped` so a container that crashes or a host reboot both bring it back automatically — confirm this is actually set for both the MySQL and Supabase compose files, don't assume the default.

**The Node API and the two Next.js apps are not containerized by this plan — they still need an actual persistent Windows service**, the same as originally planned: NSSM, or PM2 with `pm2-windows-startup`, so they survive reboots and disconnects the same way a Render-hosted service would. (`SELF_HOSTING.md` already documents the equivalent pattern for the AI server specifically — `nssm install EcoChargeAI`, `cloudflared service install` — extend the same approach to the Node API and both Next.js apps.) If containerizing these three later turns out to be worth it, that's a separate decision — this plan only containerizes the two data-bearing services (MySQL, Supabase), not the application services.

### 1.6 Migration order — don't flip everything at once

1. Install Docker Desktop on `desktop-gklhcri` (WSL2 backend), set up the `D:\EcoCharge\` folder tree per §1.0.
2. Bring up the Dockerized MySQL (§1.3), confirm the Node API can connect to it, still pointed at Render's other pieces for now.
3. Get the API server itself running locally as a persistent service (§1.5), confirm it works over `localhost` first.
4. Confirm §2's unauthenticated-endpoint fix is actually deployed on whatever the server currently runs on (it's landed in code — confirm it's live).
5. Set up the Cloudflare Tunnel and free domain per §1.1, route the API server's hostname, update all four client URL references at once (this is also issue #1 from §2 — fix them together, not separately).
6. Bring up self-hosted Supabase (§1.4), migrate image storage, decide and implement the exposure approach (proxy route recommended).
7. Migrate the two Next.js apps.
8. Only after all of the above is confirmed working end-to-end, decommission the Render services and Aiven database — keep them alive as a fallback until the self-hosted path has been proven under real use, not just a quick test.

---

## 2. `analyzation.md`'s five original issues — current status

1. **Inconsistent backend URLs across clients** — firmware, kiosk web `.env.local`, and the Flutter/console default point at three different Render hostnames. **Still open** — resolves as part of §1.6 step 4 (all four clients repointed to the single stable Cloudflare Tunnel hostname at once). Don't fix this piecemeal before the migration; fixing it early just means fixing it twice.
2. **Rotating Cloudflare quick-tunnel AI URLs** — **still open**, confirmed via `server/server_main/.env` (`AI_SERVER_URL` is still a `*.trycloudflare.com` link). Resolve by moving the AI server onto `tailscale serve` (tailnet-only, per §1.2, since nothing external calls it directly) instead of a Cloudflare quick tunnel.
3. **Secrets committed to git** (ESP32 `config.h`, live DB credentials in the tree) — **partially open.** Verified: no `.env`/`.env.local` file is or ever was tracked in git (only `.env.example` files are) — the live-credential exposure is limited to the firmware header (`esp/ecocharge/include/config.h` — `DEVICE_API_KEY`, `AI_API_KEY`, `RENDER_BASE_URL`). These must be treated as compromised (git history), which means **rotation is still outstanding**: (1) regenerate the kiosk's device key and the AI server's key, (2) extend the existing NVS pattern (`nvs_config.c` currently stores only WiFi SSID/pass) to hold device/AI keys set via the provisioning portal, (3) reflash. Doing step 2 alone without coordinated rotation leaves the leaked keys valid — do both together. Combine this reflash with the two firmware fixes below so hardware is only opened once.
4. **Unauthenticated kiosk read endpoints** — **done.** `requireAuth` added to `/list`, `/:id/ports`, `/:id/sse` (the SSE route now validates the `?token=` the client already sent); `/qr-status` deliberately left public — it's the auth bootstrap itself, secured by an unguessable single-use 5-minute-TTL session token, not a JWT-gateable route. Committed 2026-08-10.
5. **Legacy dead code** (`server_main/app/` Flask prototype, `dist/` build output) — **done.** The Flask prototype was deleted (its live CA cert relocated to `server_main/certs/ca.pem`, matching the `sslca=` path the `DATABASE_URL` actually resolves). `dist/` was never tracked in git in the first place — nothing to delete there.

**Two more, resolved by the user rather than left as pause points (recorded in `memory.md`, carried forward here):**
- **Guest account pooled balance** — kept as-is. Mitigated with a per-IP rate limit on guest session/deposit/charging-start endpoints (**done**, 2026-08-10 — 5/15min on session creation, 30/15min on deposits/charging starts, `trust proxy` wired so real IPs are used).
- **Device key comparison** (DB lookup, not constant-time) — accepted as-is, no change. Kiosks are under the team's own physical control on infrastructure they own; revisit only if logs ever show evidence of targeted probing.

---

## 3. Process & feature-execution audit — does the system actually do what it's supposed to?

### 3.1 What actually happens on a low-confidence AI detection? — **still open, a real product decision**

The admin console's `/ml-review` page lists deposits with AI confidence below 0.70, but `BottleDeposit`'s status enum only has `pending_bin → confirmed | rejected` — no distinct "pending human review" state. This means `ml-review` is a retrospective audit trail, not a gate: a low-confidence deposit still gets an immediate accept/reject decision and credits are already awarded before any human looks at it. **This has never been explicitly confirmed as intended vs. a gap.** If the team wants low-confidence deposits held for review before crediting, that's a schema + flow change (new enum value, deferred credit award, admin approve/deny actions) — a real feature, not a nicety. Ask before building either direction.

### 3.2 `SCANNING` has no timeout — **fix proposed, awaiting sign-off before flashing**

Verified in `esp/ecocharge/src/bottle_fsm.c`: `SCANNING` exits only on an `approve_bottle`/`reject_bottle` command. If the kiosk browser crashes mid-scan, the AI is down, or someone drops a bottle with no active session (the FSM triggers on the entrance sensor alone), the conveyor nudges every 2s indefinitely with no exit.

**Proposed fix** (`AUDIT.md`, grounded in the hardware description below): `BOTTLE_SCAN_TIMEOUT_MS = 60000` (60s) — covers ≥4 full worst-case AI attempts (the `/api/detect` proxy is capped ~12s) plus command-poll latency, bounding conveyor wear to ≤30 nudges instead of unbounded. On timeout, transition to `REJECTING` (the existing 10s cap already bounds that state) so an unreadable object is physically returned. Set a `scan_timed_out` telemetry flag so the kiosk UI can show a real reason instead of a silent reset. **Not yet flashed** — confirmed via grep, `BOTTLE_SCAN_TIMEOUT_MS` doesn't exist in code yet.

### 3.3 `CONFIRMING` treats one missed sensor reading as a definitive reject — **fix proposed, awaiting sign-off before flashing**

On the 8s `DROPPING` timeout, `s_bin_confirmed` latches `false` and `CONFIRMING` never re-samples the bin sensor — a sensor timing glitch is indistinguishable from "bottle never dropped," and a bottle that physically landed but whose drop the ultrasonic missed earns zero credits for something now unrecoverably inside the machine.

**Proposed fix** (`AUDIT.md`): on the `DROPPING` timeout, take one immediate fresh `ultrasonic_bottle_in_bin()` reading before latching anything; during `CONFIRMING`, keep sampling each 100ms FSM tick for up to `BOTTLE_BIN_RECHECK_MS = 4000` (4s), flipping `s_bin_confirmed = true` on `BOTTLE_BIN_CONFIRM_SAMPLES = 3` consecutive positives (≈1.5s of sustained detection — debounces a stray echo in both directions). Total worst case stays ~12.5s, inside the kiosk's bin-wait UX budget. **Not yet flashed.**

**Design principle preserved by both fixes, worth keeping in mind for any future change here:** every stage of the bottle path has its own independent sensor confirming the previous stage's claimed outcome (entrance sensor confirms an object arrived, bin sensor confirms it actually dropped) — don't simplify this away for convenience.

**Precise hardware behavior these fixes are grounded in** (for whoever implements them, so the mental model is right before touching `bottle_fsm.c`):
- **Conveyor:** driven forward for scanning nudges, reversed for rejection, fast-forwarded for dropping — not just on/off.
- **Entrance ultrasonic sensor:** detects an object has entered; this is what *triggers* the conveyor to start (object detected → conveyor on), not the conveyor running continuously waiting for something to show up.
- **Camera + AI (SCANNING):** happens while the conveyor is actively nudging — physical motion and AI capture are simultaneous, not sequential.
- **AI accept → drop:** conveyor fast-forwards the bottle into the bin.
- **Bin ultrasonic sensor:** a second, independent physical confirmation that the bottle actually landed — exists specifically because the AI's accept decision and the bottle's actual physical drop are two separate events that could disagree.
- **Relays (4x):** switch each AC charging port — physically separate from the bottle-deposit side.
- **Current + voltage sensors:** feed both the credits-to-duration calculation and the independent safety watchdog.
- **Timers:** track elapsed charging time per session against the credit-derived duration, driving both normal auto-expiry and interrupted/early-stop paths.

**Flash plan once approved:** implement both in `bottle_fsm.c`/`config.h`, bench-test with the conveyor unloaded, then combine the flash with the pending key-rotation reflash (§2 item 3) so hardware is only opened once.

### 3.4 No bin-full deposit cutoff — **server-side done, kiosk-UI treatment still pending**

Bin ≥80/95% only generated admin alerts; nothing stopped new deposits into a full bin (a silent-jam risk). **Fixed server-side**: `POST /bottle/approve` now rejects with `409 {error: "bin_full"}` at bin_level ≥ 95%. **The friendly kiosk-screen treatment** ("bin full — please try again later") is still outstanding — it belongs to the design revamp (`02-design-mandate.md` §4.4) and shouldn't be built twice.

### 3.5 ESP32 reboot mid-charging-session — **verified safe at the firmware level; server-side gap closed**

`relay_init()` explicitly drives every relay to OFF at boot before any task starts — fail-safe confirmed, no firmware change needed (`relay_control.c:43`). The server-side gap — a `ChargingSession` staying `active` after a reboot, with the user's paid minutes silently burning and no `activate_port` re-sent — **is fixed**: a stale-session sweep (60s interval) closes any `active` session on a kiosk that's been offline > 2 minutes, marking it `error` and queuing `deactivate_port`. Committed 2026-08-10, alongside the guest rate limiting.

### 3.6 Guest-to-registered-account credit migration — **resolved: no transfer, disclosure only**

Guest-earned credits are permanently pooled and cannot be attributed to a newly-registered account. Decision: keep this behavior, but the kiosk UI must say so plainly rather than let a first-time guest assume otherwise. Copy and placement are specified in `02-design-mandate.md` §4.4 — not yet built.

---

## 4. Component inventory & cleanup — **done**

Completed 2026-08-10, methodology preserved here in case new components get added later and need re-inventorying.

- **`client/web_console` + `client/kiosk_web` (Next.js/TypeScript):** used Knip (not `ts-prune`, which its own maintainer archived) — finds unused files/exports/dependencies/types across the whole project graph, with Next.js-aware plugins. Result: 42 unused dependencies pruned across both apps (only `@heroui/system`, `@heroui/theme`, `@heroui/toast`, and `recharts` remain as real HeroUI/chart usage), plus unused files removed per-app.
- **`client/flutter_app` (Flutter):** `flutter analyze` plus a manual pass on `lib/models/mock_data.dart` (zero importers, confirmed by grep — `flutter` wasn't on PATH in the audit environment so `flutter analyze` itself couldn't run, manual-only). **Deleted.**
- **Nav-component catalog:** exactly one navigation component per surface found — `kiosk_web/components/kiosk/KioskHeader.tsx` (rendered on 11 pages), `web_console/components/admin/AdminSidebar.tsx` (rendered once in the dashboard layout). Flutter uses inline `Scaffold`/`AppBar` per screen, no duplicated custom nav widgets. **No near-duplicate navbars exist — the consolidate-before-restyling step this section exists to force doesn't apply here.** Re-run this specific check if new nav components get added before the design revamp starts, since that's exactly the kind of drift this catalog is meant to catch early.

If revisiting this later (new components added since), re-run:
```bash
npx knip                              # review report
npx knip --fix --allow-remove-files   # review the diff before merging, even though full-sweep deletion is authorized
```

---

## 5. Design revamp — all four surfaces

**Full specification lives in `02-design-mandate.md`** — read it in full before generating any UI. Summary only, so this document doesn't duplicate content that drifts out of sync with the mandate:

- **Admin Console** (`client/web_console`): "Operations Console" — dense, dark-mode-first, monitoring-oriented. Status colors (green/amber/red) drive kiosk online/offline, bin level, port state, ML-review flags consistently.
- **Kiosk Web** (`client/kiosk_web`): "Clean Energy Reward" — green + white base identity, an animated background (real candidates in `02-design-mandate.md` §4.5), two modes (idle attract loop vs. active flow), the real FSM made visible as named steps via `react-step-wizard`, explicit "do not leave yet" messaging during `SCANNING` and bin-confirmation, a from-scratch FSM-aware idle timeout (none exists today), and a product mascot appearing at key moments. **Two genuinely open blockers before this goes beyond structural work**: the user's premade Figma designs (not yet linked) and the mascot's actual visual design (not yet provided) — see `02-design-mandate.md` §4.5.
- **Mobile App** (`client/flutter_app`): "Clean Energy Reward" — same palette/meaning as the kiosk, `skeletonizer`/Lottie/Rive/`flutter_animate` animation stack, credit balance as the hero number on Home.
- **Public Website** (`client/web`, new — no code exists yet): promotional site, real changelog, public docs, an app-download page. Built fresh from the Velora UI template, per `02-design-mandate.md` §6. Doesn't exist as a folder in this repo today — this is new scaffolding work, not a rebuild like the other three.

**Status, verified 2026-08-10: not started on any surface**, and the fourth surface doesn't exist yet at all. Tokens exist, tooling is installed (`design-review` agent, `avoid-ai-design` skill), component inventory is clean on the three existing surfaces — none of them have actually been rebuilt against the mandate yet, and `client/web` needs to be scaffolded before it can be "rebuilt" in any sense.

**Continuous design-review workflow, already installed:** run `/design-review` after every meaningful UI change going forward.

---

## 6. Ground rules for the whole revamp

- Read §3's hardware-behavior grounding before implementing either paused firmware fix.
- The self-hosting target machine, the two firmware fix values, and the `ml-review` gate question are the three things not to decide silently — confirm with the user, per `00-start-here.md`.
- Device-key timing and guest pooled balance are **resolved, don't re-raise** — see `memory.md`.
- Never push a hosting/DNS/database change without confirming the fallback (Render/Aiven) stays alive until the self-hosted path is proven under real use.
- Biometric-equivalent sensitivity here is the payment/credit ledger and the physical safety behavior of the relays/conveyor — treat both with the same care a payment-integrity or biometric-security fix would get elsewhere: research the correct approach before changing either, don't patch from memory or a first guess.

---

## 7. Output format for any future audit-and-fix pass

```markdown
# EcoCharge Rework — [date]

## Summary
[migration status, X Critical, X High, X Medium, X Low findings]

## Findings
### [Severity] Short title
- **Where:**
- **What's wrong / what changed:**
- **Fix:** [applied automatically | needs your input — why]
```

The self-hosting migration and any change to physical hardware behavior (the two paused firmware fixes, or anything touching the relay/E-stop path if that's ever revisited) get called out explicitly at the end of any such report as needing review before considering the pass done — a database migration and a public-internet-exposure change are exactly the categories where "I did it automatically" isn't sufficient on its own.
