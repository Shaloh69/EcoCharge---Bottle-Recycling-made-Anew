# EcoCharge Codebase Audit → `analyzation.md`

Paste this into Claude Code at the root of the EcoCharge repo to run (or re-run) a full ground-truth audit. **The last completed run of this prompt produced the current `analyzation.md`, verified against code 2026-07-22.** Re-run this whenever the codebase has drifted enough that `analyzation.md` can no longer be trusted at a glance — a real hosting migration, a firmware reflash, or several months of untracked changes are all good triggers. Don't re-run it reflexively; `AUDIT.md` already carries forward the more recent, narrower findings and doesn't need re-deriving each time.

---

You are auditing an existing thesis project called **EcoCharge** — a reverse-vending kiosk that rewards PET bottle recycling with phone-charging credits, deployed for the University of Cebu Lapu-Lapu and Mandaue. Per `docs/PROJECT_ANALYSIS.md` (the paper-vs-repo analysis from earlier in the project), the originating thesis paper describes a full smart-kiosk platform: bottle detection and validation, account flows, credit allocation, multi-port charging control, bin-level monitoring, and admin dashboards, built on Flask + MySQL + Flutter + Next.js.

**Important context, same caution as any thesis-paper-vs-repo audit:** treat the paper as a product pitch / aspirational spec for the purposes of this audit, not documentation. It's already known to diverge from the real stack in at least one confirmed way — the paper describes Flask; the real backend that got built is Node.js + Express + TypeScript + Prisma (`docs/PROJECT_ANALYSIS.md` predates this and describes an empty backend; that gap has since been closed, but the stack that closed it isn't what the paper says). **Do not assume any structure, feature, or piece of tech stack described in the paper actually exists until you've opened the real code and confirmed it.**

## How to work

1. Run `git ls-files` (or equivalent) for a full, real inventory before writing anything.
2. Map what each top-level folder actually contains and confirm it against the previously-verified structure rather than assuming it's unchanged: `client/kiosk_web` (kiosk touchscreen), `client/web_console` (admin dashboard), `client/flutter_app` (companion mobile app), `server/server_main` (Node/Express/Prisma API), `server/server_AI` (Python/FastAPI inference service), `esp/ecocharge` (ESP32 firmware), `esp/pico_sensors` (Raspberry Pi Pico ADC bridge), `scripts/` (YOLO/classifier training pipeline, outputs in `runs/`).
3. For every root-level doc (`analyzation.md`, `AUDIT.md`, `DESIGN.md`, `SELF_HOSTING.md`, `memory.md`, `docs/PROJECT_ANALYSIS.md`, `docs/PROJECT_PLAN.md`, `docs/CHECKLIST.md`, everything in `docs/planning/`), read it, but verify every claim against real code the same way you'd verify the thesis paper — these documents are written to be accurate at the time they're written, but drift is the default state of any doc that isn't re-verified, not the exception.
4. If AI/ML verification (YOLO26 detector, EfficientNet-B0 classifier), ESP32/hardware communication, the bottle-deposit FSM, the charging FSM, or any other paper-claimed or doc-claimed feature doesn't appear anywhere in the actual code, say so plainly — "claimed, no implementation found" is a valid and expected finding, not a failure of your search.
5. Note current git branch, last several commits, and any obvious half-finished work (commented-out code, TODO/FIXME, stubbed routes, functions that raise "not implemented").
6. Check every environment variable actually read by each service against what's documented — `analyzation.md` §14 is the last verified baseline; confirm which values have changed (self-hosting migration, key rotation) versus which are still on the values recorded there.

## Sections `analyzation.md` must contain

1. **System overview** — plain-language paragraph describing what the system *actually does* based on real code.
2. **Component inventory** — every real component, its path, its stack, and its role, matching the level of detail in the current §2 (Node API, AI server, kiosk web, admin console, mobile app, ESP32 firmware, Pico sensor bridge, training scripts) — flag any that appeared, disappeared, or changed role since the last audit.
3. **Architecture diagram** (ASCII, matching the current §3's style) — only components that actually exist in code, with real protocols/ports/polling intervals where determinable. Specifically re-verify the "ESP32 never receives inbound connections, polls commands + posts telemetry" design point — this is a hard architectural constraint referenced throughout the rework prompt and worth explicitly re-confirming rather than assuming it hasn't changed.
4. **Data model** — actual Prisma schema tables/columns/relationships/enums, not assumed unchanged from the last audit. Note any enum values that exist but are never assigned by any code path (the last audit found none, but this drifts easily as features get added).
5. **Authentication & security** — the real mechanism per actor (user/admin JWT, guest JWT, per-kiosk device API key, admin console cookie-gate), CORS policy, transport security (TLS to the database), and an explicit list of known gaps — re-verify each gap `analyzation.md`/`AUDIT.md` previously found is either still open or genuinely fixed (don't trust a doc's "fixed" claim without checking the code).
6. **The bottle-deposit FSM, end to end** — walk the real ESP32 state machine (`esp/ecocharge/src/bottle_fsm.c`) state by state, diagram it, and note every timeout/retry-cap value and whether each state has one. This is the section most likely to drift silently — firmware changes are easy to miss if `git log` isn't checked carefully.
7. **The charging flow, end to end** — port selection, duration derivation (credits × energy budget ÷ measured watts, with the fallback path if no live reading exists), the independent hardware watchdog, auto-expiry, and early-stop.
8. **API surface** — every real route: method, path, purpose, auth requirement. Compare against what any doc claims and flag drift either direction.
9. **Real-time channels (SSE)** — what each stream actually broadcasts and to whom.
10. **Hardware inventory** — full GPIO map, every sensor/actuator, its role, and whether it's live code or a stub. This project has real, working hardware code (unlike some prior thesis audits this format was written for) — the job here is confirming it's *still* real and *still* matches the documented pin map, not discovering whether it exists at all.
11. **Environment variables** — grouped by service, what each controls, which are still on old values (Aiven/Supabase/Render/quick-tunnel) versus migrated.
12. **Deployment picture** — what's actually hosted where, right now, not what the migration plan says it should eventually be.
13. **Drift log** — the most important section given this project's history of docs outliving the code they describe. An itemized list: for every major claim in every other current doc (`AUDIT.md`, `DESIGN.md`, `docs/planning/*`), state whether it's still accurate, partially accurate, or stale, with the specific evidence.
14. **Feature completeness matrix** — Feature | Status (Done / Partial / Stubbed / Not started) | Evidence.
15. **Known issues / rough edges** — hardcoded values, security concerns, anything notable.
16. **Open threads** — anything with evidence of being mid-flight.

## Ground rules

- Every non-trivial claim traceable to a file path (line numbers where useful).
- Descriptive only in this pass — no recommendations here, that's what `docs/planning/03-revamp-master.md` and `05-feature-build-checklist.md` are for. If this audit reveals something those documents don't yet account for, say so in the drift log rather than silently fixing it inline.
- If a section has nothing implemented, say so plainly rather than padding it with the paper's description.
- Overwrite `analyzation.md` at the repo root with the new findings — it's meant to be a living ground-truth snapshot, not an append-only log (that's what `memory.md` and git history are for).

Begin with the full file inventory, then work through the sections above.
