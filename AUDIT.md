# EcoCharge Rework — 2026-07-22

## Summary

**Migration status: BLOCKED — needs your input before anything moves.** The rework prompt targets `desktop-gklhcri`, but this machine is `MINNIEDUMPOR`, and the tailnet currently shows only `minniedumpor` and `formlab3b` — no `desktop-gklhcri` anywhere. Section 1 cannot start until you confirm the actual target machine (details in "Blocked / needs your review" at the end).

Findings: **2 Critical, 4 High, 6 Medium, 4 Low.** Section 4 inventory (Knip on both Next.js apps, manual Flutter pass, nav-component catalog) completed; results folded into findings below. Fixes marked *applied* were done after this audit was written; everything marked *needs your input* is untouched.

---

## Findings

### [Critical] Unauthenticated kiosk read endpoints
- **Where:** `server/server_main/src/routes/kiosk.ts` — `GET /list`, `GET /:id/ports`, `GET /:id/sse`, `GET /qr-status`
- **What's wrong:** None of the four validate any credential. `/:id/sse` is the "intended but incomplete" case: the kiosk client already appends `?token=` (`kiosk_web/lib/api.ts:216`) and `requireAuth` already supports query-param tokens — the middleware was simply never attached to the route. Live telemetry (per-port voltage/current, FSM state, deposit confirmations) is readable by anyone who knows the URL. This must be closed **before** any public tunnel exposure (section 1.1 sequencing rule).
- **Consumers verified before fixing:** `/list` is called by the Flutter app (always sends `Authorization` when logged in — `api_service.dart:143`) and by kiosk web's server-side `/api/health-backend` probe (tokenless — repointed to the public `/health` endpoint instead, which is what it was really checking). `/:id/ports` has **zero callers** in any client. `/qr-status` **cannot** require a JWT: it is the authentication bootstrap itself — the kiosk polls it to *obtain* its token, secured by the unguessable single-use QR session token with a 5-minute TTL. This conflicts with the prompt's "add real auth checks" to all four; left public by design and flagged in the final report.
- **Fix:** applied automatically — `requireAuth` added to `/list`, `/:id/ports`, `/:id/sse`; `health-backend` route repointed to `GET /health`; `/qr-status` left public with the rationale above.

### [Critical] Device + AI API keys committed to git (firmware `config.h`)
- **Where:** `esp/ecocharge/include/config.h` — `DEVICE_API_KEY`, `AI_API_KEY`, `RENDER_BASE_URL` as compile-time constants; the file is tracked and the keys are in history.
- **What's wrong / correction to the prompt:** the keys must be treated as compromised (git history). However, the prompt's companion claim that "`.env` files with live DB credentials" are committed is **wrong** — verified via `git ls-files` and `git log --all`: no `.env`/`.env.local` file is tracked or ever was; only `.env.example` files are. The live-credential exposure is limited to the firmware header. (`analyzation.md` overstated this too.)
- **Fix:** needs your input — rotation and the code change must land together, and rotation happens outside this repo: (1) regenerate the kiosk's device key (admin console kiosk record) and the AI server's `AI_API_KEY`, (2) extend the existing NVS pattern (`nvs_config.c` currently stores only WiFi SSID/pass) to hold device/AI keys set via the provisioning portal, (3) reflash. Doing step 2 alone without coordinated rotation leaves the leaked keys valid; tell me when you're ready to rotate and I'll implement the NVS + portal changes in the same pass.

### [High] `SCANNING` has no timeout — conveyor can nudge forever
- **Where:** `esp/ecocharge/src/bottle_fsm.c:84-122`
- **What's wrong:** Verified (§3.2): `SCANNING` exits only on an `approve_bottle`/`reject_bottle` command. `DROPPING` has an 8 s cap and `REJECTING` a 10 s cap, but `SCANNING` has none. If the kiosk browser crashes mid-scan, the AI is down, or someone drops a bottle with no session active (the FSM triggers on the entrance sensor alone, with no knowledge of whether a user session exists), the conveyor nudges every 2 s indefinitely with no exit.
- **Fix:** needs your input — it changes physical conveyor behavior, so I'm treating it under the same pause rule as 3.5. Proposed: a `BOTTLE_SCAN_TIMEOUT_MS` (~60 s) that transitions to `REJECTING`.

### [High] `CONFIRMING` treats one missed sensor reading as a definitive reject
- **Where:** `esp/ecocharge/src/bottle_fsm.c:125-153`
- **What's wrong:** Verified (§3.3): on the 8 s `DROPPING` timeout, `s_bin_confirmed` is latched `false` and `CONFIRMING` never re-samples the bin sensors — it just waits one telemetry cycle and returns to idle. A bottle that physically landed but whose drop the ultrasonic missed is unrecoverable (it's inside the machine) and earns zero credits — a direct false-reject/user-complaint source.
- **Fix:** needs your input (same physical-behavior pause rule). Proposed: during `CONFIRMING`, re-check `ultrasonic_bottle_in_bin()` (bin-level delta as a secondary signal) before finalizing.

### [High] No bin-full deposit cutoff anywhere in the stack
- **Where:** server `routes/admin.ts` (alerts only), `routes/kiosk.ts` (no check), kiosk web (no check), firmware FSM (no check)
- **What's wrong:** Verified (§3.4): bin ≥80/95 % only generates admin alerts. Nothing stops new deposits into a full bin; the failure mode is a physical jam, invisible to the user.
- **Fix:** applied automatically (server side only, per the prompt's "treat adding an explicit cutoff as a real fix"): `POST /bottle/approve` now rejects with `409 {error:"bin_full"}` when the kiosk's latest telemetry reports `bin_level ≥ 95`. The friendly kiosk-screen treatment ("bin full — please try again later") belongs to the section 6 redesign and is noted there. Threshold is the existing critical-alert level; flag if you want it configurable via SystemSettings.

### [High → downgraded to verified-safe, with one gap] ESP32 reboot mid-charging-session
- **Where:** `esp/ecocharge/src/relay_control.c:24-49`, `src/main.c`
- **What's wrong / what's fine:** Verified (§3.5): `relay_init()` explicitly drives every relay to OFF at boot (`gpio_set_level(..., !RELAY_ACTIVE_LEVEL)`) before any task starts — **fail-safe confirmed, no firmware change needed.** The remaining gap is server-side: after a reboot the ChargingSession stays `active`, the user's paid minutes keep burning, and no `activate_port` is re-sent — the user paid for charging they aren't getting.
- **Fix:** needs your input — any re-arm-relays-after-reboot logic touches relay behavior (explicit pause item). Options: refund-on-gap, or server re-queues `activate_port` with remaining duration when telemetry shows an active session with `relay_on=false`.

### [Medium] Inconsistent backend URLs across the four clients
- **Where:** firmware `config.h` (`ecocharge-server-j7u7.onrender.com`), kiosk web `.env.local` (`ecocharge-server.onrender.com`), Flutter default + console `.env.local` (`ecocharge-api.onrender.com`)
- **Fix:** deferred by design — the prompt (1.6 step 4) says fix all four together when the stable tunnel hostname exists. Blocked behind the migration block.

### [Medium] `ml-review` is retrospective, not a gate — confirmed
- **Where:** `server/src/routes/admin.ts` `GET /ml-review`; `DepositStatus` enum in `schema.prisma`
- **What's wrong:** Verified (§3.1): it's a read-only paginated list of low-confidence deposits. There is no `pending_review` status; credits are awarded on bin confirmation regardless of confidence. Money moves before any human looks.
- **Fix:** needs your input — the prompt asks whether this is intended design. If you want a hold-for-review state, that's a schema + flow change (new enum value, credit award deferred, admin approve/deny actions).

### [Medium] Guest pooled balance as an abuse surface post-migration
- **Where:** `routes/auth.ts` `POST /guest` (shared `guest@kiosk.local` account)
- **Fix:** needs your input — explicitly one of the two section 2 pause items. Question to answer: keep the pooled design once the server is self-hosted without Render's edge mitigation?

### [Medium] Device key lookup is not constant-time
- **Where:** `src/middleware/deviceAuth.ts` (`prisma.kiosk.findUnique({ where: { apiKey } })`)
- **Fix:** needs your input — the second section 2 pause item. If wanted: fetch-then-`timingSafeEqual`, or an HMAC-indexed lookup. Practical exploitability of DB-index timing over the public internet is low, but it's your call post-migration.

### [Medium] No guest→registered credit attribution path
- **Where:** verified absent from `routes/auth.ts` / `routes/users.ts` (§3.6)
- **What's wrong:** Guest-earned credits are permanently pooled; a guest who registers immediately after depositing cannot claim them, and the kiosk UI never says so.
- **Fix:** needs your input on the product question (transfer flow vs. explicit disclosure). The disclosure copy belongs in the section 6 kiosk redesign either way.

### [Medium] Dead code inventory (section 4 findings)
- **Where / what:**
  - `server/server_main/app/` — abandoned Flask prototype, tracked in git, unreferenced. **Deleted** (explicitly authorized, §2.5). The live CA cert was at `app/certs/ca.pem` — **relocated to `server_main/certs/ca.pem`** (matching the `DATABASE_URL` path `sslca=certs/ca.pem` resolved from the server root) rather than deleted.
  - `client/flutter_app/lib/models/mock_data.dart` — zero importers (verified by grep; `flutter` CLI not on this machine's PATH, so `flutter analyze` could not run — manual pass only). **Deleted.**
  - Knip, web_console — 7 unused files (`components/admin/DataTable.tsx`, `components/icons.tsx`, `components/primitives.ts`, `config/site.ts`, `lib/modal-styles.ts`, `lib/toast.ts`, `types/index.ts`). **Deleted.**
  - Knip, kiosk_web — 10 unused files (`components/icons.tsx`, `components/kiosk/FallingLeaves.tsx`, `components/kiosk/StatusCard.tsx`, `components/primitives.ts`, `config/fonts.ts`, `config/site.ts`, `hooks/useIdle.ts`, `lib/modal-styles.ts`, `lib/toast.ts`, `types/index.ts`). **Deleted.**
  - `server/server_main/dist/` — **correction to the prompt/analyzation.md:** *not* tracked in git (verified `git ls-files`), just local build output. Nothing to delete from the repo.
- **Note on `knip --fix`:** file deletions were applied manually after verifying each report line (HeroUI usage cross-checked by grep: only `@heroui/system` and `@heroui/toast` are genuinely imported). The full diff is in git for the PR-style review the prompt asks for.

### [Low] ~40 unused `@heroui/*` dependencies in each Next.js app (+ 6–7 unused devDeps, 2 unlisted eslint deps)
- **Where:** both `package.json`s (Knip report)
- **Fix:** documented, deliberately deferred to the sections 5–7 redesign — pruning the dependency tree immediately before a design revamp that will re-select the component library would churn the lockfiles twice. Consolidation target recorded here per §4.4.

### [Low] Kiosk idle timeout is not actually wired
- **Where:** `hooks/useIdle.ts` existed but had zero importers (now deleted with the dead-code pass)
- **What it means for §6.3:** the "idle-timeout must be suspended during SCANNING" requirement has no current bug to fix — there is *no* idle-timeout behavior at all today. The redesign must build it fresh, FSM-aware from day one.

### [Low] No toast system is wired in either web app
- **Where:** `lib/toast.ts` was unused in both apps (deleted). The four-category toast discipline in §5/§7 is greenfield work, not a retrofit.

### [Low] Nav-component catalog (§4.3) — clean, no consolidation needed
- **Where:** exactly one navigation component per surface: `kiosk_web/components/kiosk/KioskHeader.tsx` (rendered on 11 pages), `web_console/components/admin/AdminSidebar.tsx` (rendered once in the dashboard layout). Flutter uses inline `Scaffold`/`AppBar` per screen — no duplicated custom nav widgets found. No near-duplicate navbars exist; the §4.3 consolidate-before-restyling risk does not apply here.

---

## Firmware fix proposals — exact values, awaiting review before any flash

Grounded in the hardware description from `ECOCHARGE_KIOSK_HARDWARE_CLARIFICATIONS` §2.
The design principle preserved in both: every stage's claimed outcome is verified by
its own independent sensor — neither fix trusts a single reading or a prior stage.

### Proposal A — SCANNING timeout (fixes High: "conveyor can nudge forever")

**Change (`config.h` + `bottle_fsm.c` SCANNING case):**

| Define | Value | Justification |
|---|---|---|
| `BOTTLE_SCAN_TIMEOUT_MS` | `60000` (60 s) | One kiosk AI attempt is bounded at ~12 s (the `/api/detect` proxy timeout) + capture overhead; 60 s covers ≥4 full worst-case AI attempts plus `COMMAND_POLL_MS` (2 s) command latency. At the 2 s nudge interval that is ≤30 nudges — bounded wear instead of unbounded. |

**Behavior on timeout:** transition to `REJECTING` (conveyor reverses until the
entrance sensor clears — the existing 10 s `REJECTING` safety cap already bounds
that state), so an unreadable/foreign object is physically returned rather than
held. Set a `scan_timed_out` flag reported once via telemetry so the kiosk UI can
show "we couldn't read your bottle — please take it back and try again" instead
of a silent reset. This also closes the adjacent hole where a bottle inserted with
no active session nudges forever.

### Proposal B — CONFIRMING bin-sensor re-check (fixes High: "one missed reading = reject")

**Today:** the 8 s `DROPPING` timeout latches `s_bin_confirmed=false`, and
`CONFIRMING` never re-samples the sensor during its ~5.5 s wait — a sensor
timing glitch is indistinguishable from "bottle never dropped."

**Change (`config.h` + `bottle_fsm.c` DROPPING timeout path + CONFIRMING case):**

| Define | Value | Justification |
|---|---|---|
| `BOTTLE_BIN_RECHECK_MS` | `4000` (4 s) | Active re-check window inside `CONFIRMING` before the verdict is final. Total worst case stays ~12.5 s (8 s drop + 4 s re-check + telemetry pickup), inside the kiosk bin-wait UX budget. |
| `BOTTLE_BIN_CONFIRM_SAMPLES` | `3` consecutive positives | The sensor task refreshes readings every `SENSOR_SAMPLE_MS` (500 ms); 3 consecutive positives ≈ 1.5 s of sustained detection — debounces a single spurious echo in *both* directions (won't false-confirm on one stray reading either). |

**Behavior:** (1) on the `DROPPING` timeout, take one immediate fresh
`ultrasonic_bottle_in_bin()` reading before latching anything; (2) during
`CONFIRMING`, keep sampling each 100 ms FSM tick for up to
`BOTTLE_BIN_RECHECK_MS`, flipping `s_bin_confirmed=true` if the
consecutive-sample threshold is met — a late-arriving bottle is then credited
normally instead of falsely rejected. If the window expires with no sustained
detection, report `bottle_in_bin=false` exactly as today (the server-side
reject path is unchanged).

**Not changed:** relay/charging behavior (untouched by both proposals), the
server's confirm/reject logic, and the telemetry contract (`fsm_state` string
values stay the same; only `scan_timed_out` is additive).

**Flash plan once you approve the values:** implement both in `bottle_fsm.c`
/`config.h`, bench-test with the conveyor unloaded, then combine the flash
with the pending key-rotation reflash so hardware is only opened once.

---

## Blocked / needs your review (explicit, per section 8's closing requirement)

1. **Section 1 — entire self-hosting migration:** the target machine `desktop-gklhcri` does not match this machine (`MINNIEDUMPOR`) and is not visible in the tailnet (`minniedumpor`, `formlab3b` only). Also, external steps (dpdns.org registration, Cloudflare zone + tunnel, MySQL install, NSSM services) need to run on the real target. **Which machine is the target?**
2. **Section 1.3 — database migration:** paused as instructed; no dump/restore attempted. Also needs the Aiven password for `mysqldump` when you're ready.
3. **Section 2 — guest pooled balance:** keep or change post-migration?
4. **Section 2 — device-key timing:** accept the DB-lookup tradeoff or harden?
5. **Firmware physical-behavior fixes** (SCANNING timeout, CONFIRMING re-check, post-reboot session recovery): proposals above, awaiting your go-ahead.
6. **Key rotation** (Critical #2): code change ready to implement the moment you can rotate.
