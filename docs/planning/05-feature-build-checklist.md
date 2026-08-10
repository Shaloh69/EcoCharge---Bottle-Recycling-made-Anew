# EcoCharge — Feature & Evidence Build Checklist

Everything left once `03-revamp-master.md`'s phases (self-hosting migration, security fixes, design revamp) are done — testing infrastructure, thesis evidence, and the handful of repo-hygiene items that have been sitting untouched since `docs/PROJECT_PLAN.md`'s original Phase 0/1/8. New synthesis, not ported from another project — EcoCharge had no equivalent document before this pass.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done and verified

**Every item's status below was checked against real code/files on 2026-08-10, not assumed from an older doc** — `docs/CHECKLIST.md` (last updated 2026-03-15) claimed several of these were further along than they actually are; treat this file as the current source of truth for build status, not that one.

---

## Scope reality

The rework prompt (`03-revamp-master.md`) covers migration, security, and design. It does not cover: automated tests (none exist anywhere in the repo, verified — no `*.test.ts`, no `pytest`-style test files, no e2e scripts), the thesis evidence pack the paper-vs-repo analysis calls for, or a handful of small hygiene items that have been open since the project's early planning phase and never revisited. This document exists so those don't get silently dropped once the more urgent security/migration work is done.

---

## Stage 1 — Testing infrastructure (do this before the thesis defense, not after)

**STATUS: not started. Verified 2026-08-10 — no test files exist anywhere in the repo** (`server/server_main`, `server/server_AI`, `client/flutter_app` all checked; no `*.test.ts`/`*.spec.ts`, no `test_*.py`/`*_test.py`, no e2e scripts).

### 1.1 Backend (`server/server_main`)
- [ ] Stand up a real test runner (the repo doesn't currently declare one — check `package.json` before assuming Jest is already wired, `docs/CHECKLIST.md`'s claim that this exists is for the old Flask-era plan and doesn't apply to the Node rewrite)
- [ ] Auth routes: register, login, refresh, guest
- [ ] Kiosk routes: session create/delete, bottle approve/reject, qr-link/qr-status
- [ ] Charging routes: start (balance check, port-conflict 409), stop, active
- [ ] Device routes: commands poll/ack, telemetry (drives deposit confirmation + charging auto-expiry — this is the highest-value thing to cover, since a regression here is invisible until a real kiosk exhibits it)
- [ ] Credit enforcement: spend more than balance → 400
- [ ] **Prioritize whatever the security fixes in `03-revamp-master.md` §2 touched** — auth on the three kiosk endpoints, the bin-full 409, the rate limiter, the stale-session sweep — so these don't silently regress later with no test catching it.
- **Done when:** a CI-runnable suite covers the flows above against a real (test) database, not mocks.

### 1.2 AI server (`server/server_AI`)
- [ ] `POST /api/detect` — valid image → well-formed response shape
- [ ] Confidence threshold behavior at the boundary
- [ ] Auth: missing/invalid `X-Api-Key` → rejected
- **Done when:** `pytest` runs clean against the real loaded models (`models/best_detector.pt` and `models/best_classifier.pt` are present in the repo — confirmed — so this doesn't need placeholder weights).

### 1.3 End-to-end / integration
- [ ] Full happy path: register → deposit → credits awarded → charge start → charge complete
- [ ] Fault path: overcurrent/relay-error state reflected correctly in telemetry and UI
- [ ] Fault path: ESP32 offline → kiosk shows port unavailable, stale-session sweep fires correctly
- [ ] Fault path: backend unavailable → ESP32 retries, relays stay in the fail-safe (off) state
- [ ] Fault path: bin ≥ 95% → deposit refused with the real `409 bin_full`, kiosk shows the friendly screen (once `02-design-mandate.md` §4.4 ships)
- **Done when:** each scenario is scripted against a real running stack, not narrated as "should work."

### 1.4 Hardware validation (needs physical access — flag if unavailable)
- [ ] `activate_port` command → relay physically clicks on/off
- [ ] Overcurrent threshold trips the relay off
- [ ] Servo/conveyor forward/reverse/fast-forward cycle
- [ ] Sensor readings (entrance, bin-top, bin-bottom ultrasonic; current/voltage) appear correctly in telemetry
- [ ] Once flashed: the two paused firmware fixes (§3.2/§3.3 of `03-revamp-master.md`) behave as specified — a genuinely unreadable object times out of `SCANNING` into `REJECTING`, and a late-but-real bin drop is credited instead of falsely rejected
- **Done when:** each is verified against the real kiosk hardware, not simulated via `MOCK_GPIO`/`MOCK_CAMERA`.

---

## Stage 2 — Design revamp execution

Tracked in `DESIGN.md` (as-built) against `02-design-mandate.md` (spec) — see `04-continue-design-redo.md` for the work order. Not duplicated here to avoid two documents drifting out of sync on the same status.

---

## Stage 3 — Thesis evidence pack

**STATUS: not started.** `docs/PROJECT_PLAN.md`'s Phase 8 called for this from the start; nothing in `docs/`, `AUDIT.md`, or `DESIGN.md` indicates any of it has been produced yet.

- [ ] **Formal architecture diagram** — the ASCII diagram in `analyzation.md` §3 is accurate and can be the source, but the thesis defense needs a real diagram (draw.io or similar), covering all five layers per `docs/PROJECT_PLAN.md`'s original recommended architecture (detection, device control, orchestrator/kiosk-web, backend, client).
- [ ] **Hardware wiring diagram** — ESP32 GPIO → components, sourced from the real pin map in `analyzation.md` §11, not redrawn from memory.
- [ ] **ML evaluation report** — mAP50/precision/recall for the YOLO26 detector, classification accuracy for brand/volume/condition. Training outputs already exist in `runs/detect/` and `runs/classifier/` (confusion matrices, training-history plots per `SELF_HOSTING.md`) — this is assembling what's already been generated into a defense-ready document, not re-running training.
- [ ] **UI screenshots** — once the design revamp (Stage 2) actually ships, not before; a screenshot of the pre-revamp UI documents the wrong end state for a thesis defense.
- [ ] **User testing summary** — the paper's own survey data (78.8% supported a reward-based system, 84.8% interested in a bottle-for-charging kiosk, etc., per `docs/PROJECT_ANALYSIS.md`) already exists; this item is about *system* usability testing on the actually-built product, which is separate and hasn't happened yet.
- [ ] **Pilot deployment findings** — UC Lapu-Lapu and Mandaue, per the paper's stated deployment context. Depends on the self-hosting migration and hardware validation (Stage 1.4) being done first — a pilot on an unmigrated, untested system would produce findings about the wrong system.
- [ ] **Limitations and future work section** — write honestly once the above is in hand; a defensible thesis says what's *not* done as plainly as what is (the guest-pooled-balance design, the `ml-review` gate decision once made, and anything the design revamp doesn't reach in time are all legitimate, statable limitations rather than things to hide).
- [ ] **Thesis narrative alignment** — the paper as of `docs/PROJECT_ANALYSIS.md` still names YOLOv8; the actual implementation is YOLO26 (decided 2026-03-15, per `docs/PROJECT_ANALYSIS.md`'s own note — "no code changes needed, the thesis narrative should be updated"). Confirm this narrative update has actually been made in the paper itself, not just decided in a repo doc.

---

## Stage 4 — Small repo-hygiene leftovers

Open since `docs/PROJECT_PLAN.md`'s original Phase 0/1, never revisited. Cheap individually; worth clearing in one pass rather than leaving indefinitely.

- [ ] **Root `README.md`** — verified absent (2026-08-10). Every other sibling-project pattern this methodology follows has one: architecture overview, how to run each service, links to `analyzation.md`/`AUDIT.md`/`DESIGN.md`/`docs/planning/00-start-here.md` as the deeper references. Write this once the self-hosting migration lands, so it documents the real run commands rather than Render-era ones that'll need rewriting immediately after.
- [x] **`client/kiosk_electron`** — the empty, role-less folder `docs/PROJECT_ANALYSIS.md` flagged is gone; verified absent from the current tree. No action needed.
- [ ] **ESLint `@eslint/compat` gap** — `docs/PROJECT_ANALYSIS.md` (2026-03-15) reported `npm run lint` failing in both Next apps over a missing `@eslint/compat` import. Not found in either `package.json` on a 2026-08-10 grep, which likely means it was already resolved during the Knip dependency-prune pass — confirm with a real `npm run lint` run rather than trusting the absence of a string match.
- [ ] **Playwright MCP for `/design-review`** — explicitly flagged as not-yet-installed in `DESIGN.md`'s own execution-status list. Needed before the hardened screenshot-verification loop in `02-design-mandate.md` §0 can actually run automated, not manual, screenshot checks.

---

## Cross-cutting: definition of done

No item is ticked until:

1. Verified against **real running code/hardware**, not narrated as "should work."
2. `docs/CHECKLIST.md`, `DESIGN.md`, and `memory.md` updated to match.
3. If a fault/failure path is claimed covered, it was actually exercised — not just the happy path.
