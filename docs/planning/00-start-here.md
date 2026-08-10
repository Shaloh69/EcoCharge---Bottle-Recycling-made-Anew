# EcoCharge — Starting Prompt for Claude Code

Paste this into Claude Code at the repo root to resume work on EcoCharge's rework/revamp effort.

---

Read `analyzation.md` in full — it's a verified, ground-truth audit of this codebase as it actually exists, checked against real code (not the thesis paper's aspirational description) as of 2026-07-22. Then read `AUDIT.md` in full — it's a later, more targeted pass that found and (mostly) fixed five specific issues `analyzation.md` flagged, plus a process audit of the bottle-deposit and charging FSMs, plus exact proposed values for two firmware fixes that are **still awaiting your explicit go-ahead before anything gets flashed to hardware**. Then read `docs/planning/03-revamp-master.md` in full, **including its implementation-research section before touching any code** — it covers the self-hosting migration topology (why the ESP32's lack of a Tailscale client forces a public tunnel), the exact hardware behavior each paused firmware fix needs to preserve, and the four items that were already resolved by the user in a prior session (guest pooled balance, device-key timing, post-reboot session recovery, the staged security fixes). Then read `docs/planning/02-design-mandate.md` — it's referenced by the master prompt's design-revamp phases and is the actual specification `DESIGN.md`'s tokens were derived from.

`memory.md` at the repo root has the running decision log — read it too, it's short. It records why `docs/planning/` looks the way it does (a 2026-08-10 consolidation pass; the folder previously contained a different, unrelated thesis project's planning docs, copied in by mistake and never adapted) and the handful of "already decided, don't re-ask" items (guest pooled balance, device-key timing).

**Verified this session (2026-08-10), stated plainly because it contradicts what an earlier doc implied was resolved:** the self-hosting migration (master prompt §1) **has not started**. `server/server_main/.env` still points `DATABASE_URL` at Aiven, `SUPABASE_URL` is still set, `ALLOWED_ORIGINS` still lists `*.onrender.com`, and `AI_SERVER_URL` is still a rotating `*.trycloudflare.com` quick-tunnel link — the exact "issue #2" `analyzation.md` flagged as unfixed. Don't assume otherwise because a prior addendum said the tailnet blocker was cleared; clearing the blocker and executing the migration are two different events, and only the first happened.

**Target machine question, resolved same day:** `desktop-gklhcri`, confirmed directly by the user and corroborated via the Tailscale admin console (a distinct online Windows device from the dev machine `minniedumpor`, under its own dedicated `ecocharge123@gmail.com` account). **The architecture also changed from the original plan** — read `03-revamp-master.md` §1 in full before starting the migration, not just this summary: storage lives on Disk D (more free space than C:), with an explicit folder layout under `D:\EcoCharge\` (§1.0); MySQL runs as a Docker container instead of a native install (§1.3); and Supabase is **self-hosted via Docker**, not dropped for hand-built local storage as the original plan said (§1.4) — the app keeps its existing Supabase-REST-API integration, just repointed at the local instance.

**What's actually done, verified against real code this session, not just claimed in a doc:**
- Security/cleanup fixes (kiosk endpoint auth, bin-full guard, dead-code sweep) — committed.
- Guest-endpoint rate limiting and the stale-session sweep (post-reboot session recovery) — committed.
- Component inventory (Knip on both Next.js apps, dependency prune, nav-component catalog — no duplicates found) — done.
- `DESIGN.md` tokens defined, `design-review` agent + `avoid-ai-design` skill installed.
- **Not done**, confirmed by grepping each surface's dependencies: no typography swap (no Space Grotesk/Outfit/IBM Plex wired into either Next.js app), no step-wizard on the kiosk, no animation-library additions to the Flutter app (`skeletonizer`/`lottie`/`rive`/`flutter_animate` all absent from `pubspec.yaml`). The design *system* exists on paper; none of the three surfaces have been visually rebuilt against it yet.
- **Not done**: the two firmware fixes (`BOTTLE_SCAN_TIMEOUT_MS`, `BOTTLE_BIN_RECHECK_MS`) — grepped `esp/ecocharge`, neither constant exists in code yet. Correctly still paused pending your review, per the rule below.
- **Not done**: key rotation (device API key + AI API key) — this needs to happen together with an NVS/provisioning-portal code change, and rotation itself happens outside this repo (in the admin console + wherever the AI server's key is issued), so it can't be completed unattended.

## Work order

1. **Self-hosting migration** (`docs/planning/03-revamp-master.md` §1) — the biggest remaining piece of work, and no longer blocked on a target-machine question. Target is `desktop-gklhcri`; storage lives on Disk D under `D:\EcoCharge\` (§1.0); MySQL and Supabase both run in Docker on that machine, with Supabase self-hosted rather than replaced. Install Docker Desktop (WSL2 backend) there first if it isn't already present.
2. Work the migration in the order `03-revamp-master.md` §1.6 lays out — don't flip DNS/tunnel/database over all at once.
3. **Key rotation** — tell me when the self-hosting migration has a stable API hostname ready; rotating the device/AI keys before that just means rotating them twice.
4. **The two paused firmware fixes** — `AUDIT.md` has exact proposed values (`BOTTLE_SCAN_TIMEOUT_MS=60000`, `BOTTLE_BIN_RECHECK_MS=4000`, 3-consecutive-sample debounce) and the physical reasoning behind each. Review those values; if they look right, say so explicitly and I'll implement + bench-test before any real flash. Combine the flash with the key-rotation reflash so the hardware is only opened once, per the master prompt.
5. **The `ml-review` gate question** — still genuinely open, never answered in any later doc: is a low-confidence AI detection meant to be held for human review *before* credits are awarded, or is the current retrospective audit-trail behavior (credits awarded immediately, `ml-review` just lets an admin spot-check afterward) actually the intended design? This is a real product decision, not something to infer from the code.
6. **Design revamp** (`docs/planning/02-design-mandate.md`) — do this after the migration and the paused-item cleanup, using the component-inventory pass (already done) as the base. Full delete-and-rebuild per the mandate, screenshot-verified against the real deployed instance per its hardened verification loop, not a local dev server.
7. Work through `docs/planning/05-feature-build-checklist.md` for what's left beyond the rework prompt itself (testing infrastructure, thesis evidence pack, remaining Phase 8 items from `docs/PROJECT_PLAN.md`).

Work continuously through what's unblocked — don't stop for review after each step. Only stop for:
- The self-hosting target-machine question (step 1) — genuinely can't proceed correctly without it.
- The firmware fix values (step 4) — physical hardware, needs sign-off before any flash.
- The `ml-review` gate question (step 5) — a product decision, not a code question.
- Anything that turns out to need physical access to the kiosk hardware you don't have.

Otherwise keep moving and give one summary at the end — file references for what changed, and anything left incomplete and why.

Start by confirming the self-hosting target machine, then proceed with `docs/planning/03-revamp-master.md` §1.
