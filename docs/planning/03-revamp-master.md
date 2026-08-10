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
- **§1 self-hosting migration: substantially underway as of 2026-08-11, not just planned.** The Node API now runs live on `desktop-gklhcri` (`D:\EcoCharge\app\server_main`, `EcoChargeAPI` scheduled task) against the Dockerized MySQL (fresh schema, no Aiven data — Aiven is dead/abandoned, not migrated, by explicit decision) and writes media to a local folder on the same box instead of Supabase (Supabase — cloud and self-hosted — is fully decommissioned, see §1.4). Still open: `ALLOWED_ORIGINS` still lists `*.onrender.com` (tied to the Cloudflare Tunnel step, not yet done), the AI server is still on a rotating `*.trycloudflare.com` URL, and the two Next.js apps haven't been moved to persistent services yet. **Target machine confirmed 2026-08-10: `desktop-gklhcri`**, per the user directly, corroborated by the Tailscale admin console — a distinct online Windows device from the dev machine (`minniedumpor`), registered under its own dedicated `ecocharge123@gmail.com` account. Storage lives on **Disk D** (more free space than C:).

---

## 1. Self-hosting migration — moving everything onto `desktop-gklhcri`

**Read this whole section before touching anything** — the single biggest risk here is treating this as a simple "move the files" task when it's actually a networking-topology change, because of one hard constraint below.

**Target machine: `desktop-gklhcri` — confirmed 2026-08-10, not an open question anymore.** Verified via the Tailscale admin console: two distinct Windows devices are online, `minniedumpor` (the day-to-day dev machine, `dumporshemjoshua@gmail.com`) and `desktop-gklhcri` (`ecocharge123@gmail.com` — a dedicated account, consistent with this being the intended standing server, not a shared personal machine). Everything server-side in this section — MySQL, the self-hosted Supabase stack, the Node API, both Next.js apps, the AI server — runs on `desktop-gklhcri`. Development/Claude Code work can still happen from `minniedumpor`, reaching `desktop-gklhcri` over the tailnet (SSH or remote commands), the same pattern used elsewhere in this project.

**Storage location: Disk D on `desktop-gklhcri`, not C.** D: has materially more free space than C: on that machine — every persistent volume this section creates (MySQL data, Supabase's Postgres + Storage objects, backups, logs) goes under a structured tree on D:, not scattered across C: and D:. See the **folder management** subsection below for the exact layout — set it up before running any `docker compose up`, since Docker will happily create anonymous volumes on C: (the default Docker Desktop disk) if bind-mount paths aren't specified up front, and moving a populated volume after the fact is real, avoidable rework.

**Containerization: MySQL and Supabase both run in Docker, not native installs.** This is a change from the original version of this plan (which called for a native MySQL install and dropping Supabase entirely in favor of hand-built local storage). Reasoning below in §1.3/§1.4 — the short version: Docker gives clean, disk-relocatable, backup-friendly volumes for both, and self-hosting Supabase (rather than replacing it) means the app's existing Supabase-REST-API integration code barely has to change, just repoint at a different URL and a newly-generated key.

**Prerequisite: Docker Desktop on `desktop-gklhcri`.** Windows, so this means Docker Desktop with the WSL2 backend (not Hyper-V-only) — confirm WSL2 is enabled before installing Docker Desktop, since that's the more common source of a broken-looking install on Windows. **Already satisfied, confirmed 2026-08-10** — Docker 29.6.2 and a WSL2/Ubuntu backend are already present on the machine; don't reinstall.

**SSH access, confirmed working 2026-08-10: `ssh transfer@desktop-gklhcri`** (the `transfer` account, not the local dev machine's own Windows username). `D:\EcoCharge\EcoCharge\` already holds a clone of this repo on that machine — keep it synced (`git pull`) rather than assuming a fresh clone is needed.

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
| ~~Self-hosted Supabase~~ | — | **Removed 2026-08-11 — Supabase (cloud and self-hosted) is fully decommissioned; see §1.4.** Avatars are local files served by the Node API's own `/media` route, so this row no longer applies — one public hostname (the API) covers this concern with no second service to reason about exposure for. |

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
3. ~~Dump the existing Aiven database and restore it into the container~~ — **superseded 2026-08-11, explicit user instruction: "scrap and dump the whole aiven and supabase," "you dont need to access aiven or supabase."** Aiven's hostname was independently found dead by DNS (`Non-existent domain`) the same day, so this was likely moot regardless. The Docker MySQL instance was seeded fresh via `npx prisma db push` (not `migrate deploy` — see the note below) plus `npm run seed` — **no historical data carried forward, by deliberate decision, not default.** See `memory.md`'s 2026-08-11 entry.
4. `DATABASE_URL` for the live deployment: `mysql://root:<MYSQL_ROOT_PASSWORD>@127.0.0.1:13306/ecocharge` — correct only when the Node API runs on `desktop-gklhcri` itself (confirmed working 2026-08-11, both processes now co-located on that box, matching §1.5 below).
5. **Real gap found in `prisma/migrate deploy` against a genuinely empty database, 2026-08-11: only fails partway.** `prisma/migrations/` contains three incremental ALTER-style migrations (`add_deposit_status`, `add_bottle_status_column`, `add_expired_command_status`) but no baseline migration that actually `CREATE TABLE`s anything — the original schema was evidently built via `prisma db push` during development, and these three were added later without ever generating a full baseline. `migrate deploy` against a fresh DB gets partway through and fails with `P3018: Table 'ecocharge.bottle_deposits' doesn't exist`. **Use `prisma db push` for a from-scratch database, not `migrate deploy`** — this is a real, verified finding, not a guess; don't re-attempt `migrate deploy` on an empty DB expecting a different result. (`migrate deploy` should still work fine for *future* incremental changes against this now-populated schema, since Prisma just won't have replay history predating today.)
6. **Backup routine, adapted for the Docker + Disk D setup**: a scheduled task (Windows Task Scheduler, not a manually-remembered step) running `docker exec <container> mysqldump ...` on a cron-like interval, writing to `D:\EcoCharge\backups\mysql\` (per §1.0), with output additionally synced or copied off-machine — a backup that lives on the same physical disk as the database it's backing up doesn't protect against a disk failure, only against a bad migration or an accidental `DROP`. **Still not set up as of 2026-08-11** — the live system currently has no automated backup; this is real exposure until it's built.

### 1.4 Media storage — local disk on the server PC, not Supabase at all

**Superseded 2026-08-11, explicit user instruction: "save images or media on a folder inside... the server pc," "you dont need to access... supabase," "scrap and dump the whole aiven and supabase."** Everything below in this section (self-hosted Supabase via Docker) was actually built on 2026-08-10 — stood up, verified 10/10 healthy — and then **torn down again the next day** on this instruction (`docker compose down -v` on `D:\EcoCharge\supabase\docker`, its auto-start scheduled task deleted). The vendored compose project files are left on disk at `D:\EcoCharge\supabase\` in case they're ever wanted again, but nothing is running and the app no longer talks to Supabase in any form — cloud or self-hosted. See `memory.md`'s 2026-08-11 entry for the full reasoning.

**What actually ships instead:** the Node API writes uploaded files straight to a folder on whichever machine it's running on (`MEDIA_STORAGE_PATH`, default `D:\EcoCharge\media` in production) and serves them back out itself via `express.static` at `/media` — no separate storage service, no bucket concept, no second Docker stack. `POST /me/avatar` (`src/routes/users.ts`) now does a plain `fs.writeFile` into `<MEDIA_STORAGE_PATH>/avatars/<userId><ext>` and returns `${req.protocol}://${req.get("host")}/media/avatars/<userId><ext>` as `profile_picture_url` — the URL is derived from however the client actually reached the API, so it keeps working unchanged once the Cloudflare Tunnel hostname replaces `localhost`/the tailnet address, with no separate config to update.

**Why this is fine for this app's actual needs:** the only storage consumer in the whole API surface is the avatar upload route (confirmed via grep, 2026-08-11) — there's no bottle-photo storage, no other media type. A single-purpose local folder, on the same box that already serves the API, is simpler than running and maintaining a second service (self-hosted Supabase) for one upload route, and it removes an entire class of "is Kong/Auth/Studio accidentally exposed" exposure questions that §1.2's table used to have to account for.

### 1.5 Persistence — two different mechanisms for two different kinds of service

**MySQL is a Docker container — persistence is `restart: unless-stopped` in the compose file.** Docker Desktop itself needs "start on login/boot" enabled (its own setting); the MySQL compose entry already has `restart: unless-stopped`. (Supabase no longer applies here — see §1.4.)

**The Node API is not containerized — it runs as a Task Scheduler-launched process, not NSSM/PM2.** Neither NSSM nor PM2 is installed on `desktop-gklhcri` (checked 2026-08-11, neither `Get-Command` resolved), and this repo already has a proven pattern for detached, SSH-survivable Windows processes from the AI training jobs earlier in this project (`EcoChargeTrain`/`EcoChargeTrainResume` — a `.bat` launcher plus `schtasks`, because a bare `Start-Process` over SSH dies the moment the SSH session's job object tears down). The Node API reuses the same pattern: `D:\EcoCharge\app\server_main\run_server.bat` (a `:loop` batch script — runs `node dist\index.js`, and on exit for *any* reason logs it and restarts after 5s, giving crash resilience without a real service manager) registered as scheduled task `EcoChargeAPI` with an `ONSTART` trigger (`schtasks /Create /SC ONSTART ...`), started immediately with `schtasks /Run /TN EcoChargeAPI`. **Verified working 2026-08-11**: process live (`node dist/index.js`, confirmed via `Get-CimInstance Win32_Process`), `/health` returns 200 against the real Docker MySQL connection. **Not verified**: an actual reboot of `desktop-gklhcri` — the `ONSTART` trigger's behavior across a real restart is inferred from the same pattern already trusted for the training tasks, not independently confirmed, since rebooting a shared machine mid-training wasn't a reasonable thing to test just to prove this.

The two Next.js apps (admin console, kiosk web) still need the same treatment — not yet done, tracked in `08-master-checklist.md`.

### 1.6 Migration order — don't flip everything at once

1. Install Docker Desktop on `desktop-gklhcri` (WSL2 backend), set up the `D:\EcoCharge\` folder tree per §1.0. **Done.**
2. Bring up the Dockerized MySQL (§1.3), confirm the Node API can connect to it. **Done 2026-08-11** — fresh schema via `prisma db push`, seeded, live at `127.0.0.1:13306`.
3. Get the API server itself running as a persistent service (§1.5), confirm it works. **Done 2026-08-11** — `EcoChargeAPI` scheduled task, verified serving `/health` against the real DB.
4. Confirm §2's unauthenticated-endpoint fix is actually deployed on whatever the server currently runs on. **Done** — landed 2026-08-10, now running as part of the deployment in step 3.
5. Set up the Cloudflare Tunnel and free domain per §1.1, route the API server's hostname, update all four client URL references at once (this is also issue #1 from §2 — fix them together, not separately). **Not done** — next real piece of Phase A.
6. ~~Bring up self-hosted Supabase, migrate image storage~~ — **superseded, see §1.4**: media storage is a local folder on the API's own host, done as part of step 3, no separate service to bring up.
7. Migrate the two Next.js apps to the same persistent-service pattern as step 3. **Not done.**
8. Decommission Render and Aiven once the above is proven under real use. **Aiven: already unreachable (dead DNS) and explicitly abandoned by user instruction 2026-08-11 — nothing to decommission, there's nothing left pointing at it.** Render: still the live deployment for the two Next.js apps until step 7 lands — don't turn it off first.

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

**Component library, reversed 2026-08-10 — real scope change, not a detail:** HeroUI is being **deleted entirely** from both `client/kiosk_web` and `client/web_console`, not kept and re-themed. Replacements: **Mantine** for the Admin Console, **shadcn/ui on Radix UI or Base UI primitives** for Kiosk Web — full reasoning in `02-design-mandate.md`'s intro and §7. This is a bigger lift than the original "align and extend the existing HeroUI layer" plan implied; budget for it accordingly when sequencing the design work.

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
