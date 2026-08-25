# EcoCharge — Starting Prompt for Claude Code (post-reset, current as of 2026-08-20)

Paste this into Claude Code at the repo root to resume work on EcoCharge.

---

## Where things actually stand

The 2026-08-12 ground-zero reset — ordered after this file went stale three times in one day — **has been executed and verified**. Read `memory.md` (newest-first) for the full dated record; `docs/planning/08-master-checklist.md` is the single source of truth for per-item status, and every claim in it dated 2026-08-12 or later was verified against the live deployed system, not against other docs. What the reset produced, in one paragraph:

The folder scatter is gone (one numbered series under `docs/planning/`, only `README.md` + `memory.md` at root; `DESIGN.md` and `docs/CHECKLIST.md` retired). The reset's re-verification immediately caught a real 7-hour backend outage (Scheduled Tasks registered "Interactive only" can't fire `ONSTART`; fixed with `/RU SYSTEM`, and the fix **survived a real reboot on 2026-08-18** — proven, not inferred). It also caught a live secret leak (`/api/health-ai` returned most of the AI key to the public internet — fixed, both keys rotated, old values verified dead, git history rewritten with `filter-repo`). The mobile "Update Required" hard-block gate was built and then **live-verified in both directions** (a real client genuinely blocks below `MIN_APP_VERSION` and passes at it) — and that verification caught a stale web plugin registrant that had silently disabled the whole gate on web. The rate limiter was verified with a genuine two-external-IP test on the real Cloudflare topology. The kiosk guest flow was walked end-to-end live, which caught two more real bugs (staging kiosk row missing from the reseeded DB; guest-auth failure navigating into a dead session hub) — both fixed and re-verified.

**The recurring cost to know about: quick-tunnel URL rotation.** Every reboot/tunnel restart rotates all five `trycloudflare.com` hostnames (accepted tradeoff, re-confirmed by the user 2026-08-12 after it bit for real). The proven rotation runbook is in `08-master-checklist.md` Phase A's top banner. The two traps that already bit once each: `NEXT_PUBLIC_*` is **build-time inlined** (editing host `.env.local` + restart is NOT enough — rebuild and ship both Next.js apps), and the host can't build them itself (no route to Google Fonts) — build locally, `tar`/`scp`/swap. Also: never write host env files with `Set-Content -Encoding utf8` (BOM corrupts line 1); use `[System.IO.File]::WriteAllLines` with `UTF8Encoding($false)`.

## Standing session rules (unchanged)

- **Keep moving; don't pause to ask "should I continue?"** Stop only for `[!]` items in the checklist, new decisions of that same shape, or actions needing physical hardware / external sign-off.
- **"Done" means live-verified against the deployed instance** — a clean build is not a screenshot; a doc agreeing with another doc is not evidence. This discipline caught every real incident above; keep it.
- **First action every session: confirm Playwright MCP is actually loaded** (`ToolSearch` for `mcp__playwright__browser_navigate` — schemas, not names). It has arrived late or missing in multiple sessions.
- Update `memory.md` the moment something real is found or decided. Commit as you go. Ask before pushing unless push approval was already given this session.
- Flutter SDK: `D:\Projects-Shem\Flutter\flutter\bin` (not on PATH). Server access: see the desktop-gklhcri memory note — `/RU SYSTEM /RL HIGHEST` is load-bearing for anything `ONSTART`.

## Open work, in priority order

1. **The `[!]` decisions still genuinely open** (stop-and-ask, don't guess):
   - ~~AI 0.40 vs kiosk 0.5 floor~~ **SETTLED 2026-08-20: 0.5, shipped and live-verified** (AI server raised to match; kiosk literal is now a named `ACCEPT_CONFIDENCE`).
   - **YOLO26 thesis-narrative confirmation** — the paper isn't in this repo (re-confirmed: no `.docx`/thesis file anywhere in the tree); only the user can check it.
   - **Firmware flash sign-off + physical access** — both FSM fixes live in source (`bottle_fsm.c`, verified present 2026-08-20), hardware still unreachable. **Now larger in scope: hardware rev 3.0.0 (2026-08-20) replaced the Pico with a second ESP32 and added a WiFi reset button (GPIO22).** Both firmwares compile clean but **nothing has been flashed or probed** — first bench task is flashing ESP32-B and confirming the UART link. See `08-master-checklist.md` Phase C and `docs/evidence/hardware-wiring-diagram.md`.
   - **Device-key firmware half** — the DB side is rotated; moving keys into NVS via the provisioning portal still needs the ESP32 in hand. `config.h` now ships `SET_AT_BUILD_TIME` placeholders — never commit a real key again.
2. **Auto-reject: mostly already shipped** — re-reading the code showed the kiosk already rejects below the floor and never awards credits. Remaining: a specific reject *reason* on the result screen (low-confidence vs nothing-detected), and whether `ml-review` stays a passive audit trail for the now-real 0.5–0.7 accepted band.
3. ~~Admin Console E1 remainder~~ **DONE 2026-08-20**: all 11 data pages screenshot-verified behind a real login via a throwaway admin (created, used, deleted, 401-confirmed). Caught two real bugs doing it — a hardcoded sidebar identity, and a `Paginated<T>` type whose optional keys let five data pages read a field that never existed. See `memory.md`.
4. **Kiosk E2 remainder**: `/session/deposit`, `/session/charging`, `/session/result`, receipts, `/auth/linked` — need deposit/charging state a browser can't fake without hardware.
5. **Phase E design backlog**: mobile screens beyond Home (and Home's balance-card gradient, a banned pattern logged 2026-08-20); bin-full screen (§4.4); Lottie scanning composite (§4.3); the formal `/design-review` + `avoid-ai-design` passes as their own runs; the `optional`-tier update nudge on mobile Home. Follow `02-design-mandate.md` to the letter — including the 2026-08-12 template/palette corrections (lifted dark primary `#34D399`, no Mantine-template/TailAdmin references, Mobile's locked template refs + `fallingLeaves` background).
6. **Phase H thesis evidence**: UI screenshots are accumulating in `docs/design-screenshots/` (fresh deployed set 2026-08-20); user-testing summary and pilot findings remain blocked on hardware/deployment.
7. **Hygiene**: Flutter widget tests (none exist); the AI-server `pytest` suite hasn't been re-run since 2026-08-11 (dev deps deliberately don't ship to the host — re-run locally when a local venv with the models exists).

## Settled — don't re-litigate

Guest pooled balance (kept, rate-limited) · device-key timing (accepted) · free quick tunnels incl. rotation chore (re-confirmed 2026-08-12) · dataset merge (dropped) · mascot art (authorized, inspired-by credit required wherever it ships) · `ml-review` gate (decided 2026-08-12: **auto-reject below threshold**; threshold settled 2026-08-20 at **0.5** and shipped — the kiosk already behaved this way, see item 2) · update gate is a **hard block** below min, dismissible nudge below latest, **fails open** on outage (proven necessary by the 08-12 outage) · `06-must-have-app-features.md` re-verified and corrected 2026-08-20 (its testing/release rows were stale — trust the current file).

## One user-side loose end

The pre-rewrite git objects (containing both dead keys and the slur-prefixed plaintext) **are still publicly fetchable on GitHub by direct SHA** — re-confirmed 2026-08-20. The user planned to delete + recreate the repo; that hasn't happened yet. Until it does, remind — don't nag, but don't let it silently drop either.
