# EcoCharge — Feature & Evidence Build Checklist

Everything left once `03-revamp-master.md`'s phases (self-hosting migration, security fixes, design revamp) are done — testing infrastructure, thesis evidence, and the handful of repo-hygiene items that have been sitting untouched since `docs/planning/13-project-roadmap.md`'s original Phase 0/1/8. New synthesis, not ported from another project — EcoCharge had no equivalent document before this pass.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done and verified

> ### ⚠️ SUPERSEDED FOR STATUS — corrected 2026-08-20
>
> The paragraph below used to read *"treat this file as the current source of truth for build status, not `08-master-checklist.md`."* **That is now exactly backwards and was actively misleading.** This file's statuses were accurate on **2026-08-10** and were never updated again, while `08-master-checklist.md` has been re-verified against the live system repeatedly since. Between those dates the test infrastructure, the whole thesis evidence pack, the root README, Playwright, and several AI-pipeline items all shipped — all of which this file still listed as not-started.
>
> **`docs/planning/08-master-checklist.md` is the source of truth for status.** This file remains useful as the *scope inventory* — the full list of what production needs — and its individual items have been corrected below. For a single ordered pre-production view, see **`docs/planning/14-production-readiness.md`**.

**Original note (2026-08-10):** every item's status below was checked against real code/files on that date, not assumed from an older doc.

---

## Scope reality

The rework prompt (`03-revamp-master.md`) covers migration, security, and design. It does not cover: automated tests (none exist anywhere in the repo, verified — no `*.test.ts`, no `pytest`-style test files, no e2e scripts), the thesis evidence pack the paper-vs-repo analysis calls for, or a handful of small hygiene items that have been open since the project's early planning phase and never revisited. This document exists so those don't get silently dropped once the more urgent security/migration work is done.

---

## Stage 1 — Testing infrastructure (do this before the thesis defense, not after)

**STATUS: not started. Verified 2026-08-10 — no test files exist anywhere in the repo** (`server/server_main`, `server/server_AI`, `client/flutter_app` all checked; no `*.test.ts`/`*.spec.ts`, no `test_*.py`/`*_test.py`, no e2e scripts).

### 1.1 Backend (`server/server_main`)
- [x] **DONE 2026-08-11** — `vitest` wired (`npm test`); 18 tests passing as of 2026-08-20 across `auth.test.ts`, `rateLimit.test.ts`, `appConfig.test.ts`.
- [~] Auth: `requireAuth`/`requireAdmin` middleware fully covered (no/malformed/expired token, header + `?token=` query path, admin 403). **Route-level** register/login/refresh/guest still only exercised via the E2E suite, not unit tests.
- [~] Covered end-to-end by the integration suite (approve → telemetry → credits) and exercised live 2026-08-20 (guest session + qr-status polling). No dedicated unit tests.
- [~] Happy path + auto-expiry covered by the integration suite. **Port-conflict 409 and insufficient-balance paths are not directly tested.**
- [~] Telemetry-driven deposit confirmation and charging auto-expiry are covered by the integration suite (the highest-value path). Command poll/ack round-trip is **not** unit-tested.
- [ ] Credit enforcement: spend more than balance → 400. **Still untested — real money-like logic, worth adding before production.**
- [x] **DONE** — rate limiter and auth middleware both have dedicated unit tests; bin-full 409 and the stale-session sweep are covered by the integration suite. Original note: **prioritize whatever the security fixes in `03-revamp-master.md` §2 touched** — auth on the three kiosk endpoints, the bin-full 409, the rate limiter, the stale-session sweep — so these don't silently regress later with no test catching it.
- **Done when:** a CI-runnable suite covers the flows above against a real (test) database, not mocks.

### 1.2 AI server (`server/server_AI`)
- [x] **DONE 2026-08-11** — `server_AI/tests/test_main.py`, run against the real FastAPI app with real models loaded.
- [ ] Confidence threshold behaviour **at the boundary** — still untested, and now more important: the floor was reconciled to **0.5** on 2026-08-20 and is the exact line where a real user's bottle is refused.
- [x] **DONE 2026-08-11** — covers missing key, wrong key, and the `Authorization: Bearer` fallback path the kiosk's `/api/health-ai` depends on.
- **Done when:** `pytest` runs clean against the real loaded models (`models/best_detector.pt` and `models/best_classifier.pt` are present in the repo — confirmed — so this doesn't need placeholder weights).

### 1.3 End-to-end / integration
- [x] **DONE 2026-08-11** — real HTTP + real isolated DB (`ecocharge_test`), no mocking.
- [x] **DONE 2026-08-11** — verified via the real `/kiosk/:id/ports` endpoint.
- [x] **DONE 2026-08-11** — calls the real `reconcileStaleSessions()`, confirms the session errors and a real `deactivate_port` command is queued.
- [ ] Fault path: backend unavailable → ESP32 retries, relays stay fail-safe (off). **Correctly NOT faked** — this is firmware behaviour and needs real hardware or a simulator. Documented as out of scope in the test file's own header.
- [~] Server side **done** (409 verified, no deposit row created). Kiosk-side friendly screen: the route exists (`/session/bin-full`) and the deposit page routes to it on `bin_full`, but the §4.4 screen itself is still unbuilt.
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

Tracked in `docs/planning/02-design-mandate.md` (as-built) against `02-design-mandate.md` (spec), with the live per-item work order in `08-master-checklist.md` Phase E. Not duplicated here to avoid two documents drifting out of sync on the same status. (`04-continue-design-redo.md`, previously named here as the work order, was retired 2026-08-11 — fully superseded.)

## Stage 1.5 — AI detection reliability (conveyor detection problem)

**STATUS: diagnosed 2026-08-10, not yet fixed.** Full technical detail in `07-ai-detection-improvements.md` — not duplicated here, tracked as a checklist only.

- [ ] Firmware "nudge complete" signal + kiosk capture-on-signal (replaces the current blind-timer capture) — proposed alongside the two paused firmware fixes in `03-revamp-master.md` §3.2/§3.3, same review-before-flash gate
- [x] **DONE 2026-08-11** — `getUserMedia` now requests 1280x720 ideal.
- [x] **DONE 2026-08-11** — 3 frames ~100 ms apart, sharpest chosen client-side by variance-of-Laplacian; cheaper than N AI calls.
- [x] **DECIDED AND SHIPPED 2026-08-20: 0.5.** AI server raised 0.40 → 0.50 to match the kiosk; kiosk literal is now a named `ACCEPT_CONFIDENCE`. Verified live in the AI server's startup log.
- [x] **DROPPED by explicit user instruction** — not pursued. Original scope: dataset expansion — merge the on-domain Roboflow sets (reverse-vending-machine, conveyor-belt) found in `07-ai-detection-improvements.md` §4.2, plus a real capture pass through the actual production camera/conveyor for classifier training data
- **Done when:** a real bottle mid-nudge on the actual conveyor is reliably detected across repeated trials, not just in the same conditions the original 148-image set was captured under.

---

## Stage 3 — Thesis evidence pack

**STATUS: not started.** `docs/planning/13-project-roadmap.md`'s Phase 8 called for this from the start; nothing in `docs/`, `docs/planning/11-audit-findings.md`, or `docs/planning/02-design-mandate.md` indicates any of it has been produced yet.

- [x] **DONE 2026-08-11** — `docs/evidence/architecture-diagram.md` (real Mermaid, live topology). Original scope: **formal architecture diagram** — the ASCII diagram in `docs/planning/09-system-analysis.md` §3 is accurate and can be the source, but the thesis defense needs a real diagram (draw.io or similar), covering all five layers per `docs/planning/13-project-roadmap.md`'s original recommended architecture (detection, device control, orchestrator/kiosk-web, backend, client).
- [x] **DONE 2026-08-11, rewritten for hardware rev 3.0.0 on 2026-08-20** — `docs/evidence/hardware-wiring-diagram.md`, both ESP32 pin tables + the WiFi reset button circuit. Original scope: **hardware wiring diagram** — ESP32 GPIO → components, sourced from the real pin map in `docs/planning/09-system-analysis.md` §11, not redrawn from memory.
- [x] **DONE 2026-08-11** — `docs/evidence/ml-evaluation-report.md` (mAP50 0.995, mAP50-95 0.9447, P 0.999, R 1.0). Honest about what it does not cover. **Still manual:** pulling the confusion-matrix/PR-curve PNGs off `desktop-gklhcri` (gitignored by design). Original scope: **ML evaluation report** — mAP50/precision/recall for the YOLO26 detector, classification accuracy for brand/volume/condition. Training outputs already exist in `runs/detect/` and `runs/classifier/` (confusion matrices, training-history plots per `docs/planning/12-self-hosting-guide.md`) — this is assembling what's already been generated into a defense-ready document, not re-running training.
- [ ] **UI screenshots** — once the design revamp (Stage 2) actually ships, not before; a screenshot of the pre-revamp UI documents the wrong end state for a thesis defense.
- [ ] **User testing summary** — the paper's own survey data (78.8% supported a reward-based system, 84.8% interested in a bottle-for-charging kiosk, etc., per `docs/planning/10-paper-vs-repo-gap.md`) already exists; this item is about *system* usability testing on the actually-built product, which is separate and hasn't happened yet.
- [ ] **Pilot deployment findings** — UC Lapu-Lapu and Mandaue, per the paper's stated deployment context. Depends on the self-hosting migration and hardware validation (Stage 1.4) being done first — a pilot on an unmigrated, untested system would produce findings about the wrong system.
- [x] **DONE 2026-08-11** — `docs/evidence/limitations-and-future-work.md`, drawn from real current gaps. Needs a refresh once the remaining items here close. Original scope: **limitations and future work section** — write honestly once the above is in hand; a defensible thesis says what's *not* done as plainly as what is (the guest-pooled-balance design, the `ml-review` gate decision once made, and anything the design revamp doesn't reach in time are all legitimate, statable limitations rather than things to hide).
- [ ] **Thesis narrative alignment** — the paper as of `docs/planning/10-paper-vs-repo-gap.md` still names YOLOv8; the actual implementation is YOLO26 (decided 2026-03-15, per `docs/planning/10-paper-vs-repo-gap.md`'s own note — "no code changes needed, the thesis narrative should be updated"). Confirm this narrative update has actually been made in the paper itself, not just decided in a repo doc.

---

## Stage 4 — Small repo-hygiene leftovers

Open since `docs/planning/13-project-roadmap.md`'s original Phase 0/1, never revisited. Cheap individually; worth clearing in one pass rather than leaving indefinitely.

- [x] **DONE** — root `README.md` exists and was refreshed 2026-08-20. Original note: verified absent (2026-08-10). Every other sibling-project pattern this methodology follows has one: architecture overview, how to run each service, links to `docs/planning/09-system-analysis.md`/`docs/planning/11-audit-findings.md`/`docs/planning/02-design-mandate.md`/`docs/planning/00-start-here.md` as the deeper references. Write this once the self-hosting migration lands, so it documents the real run commands rather than Render-era ones that'll need rewriting immediately after.
- [x] **`client/kiosk_electron`** — the empty, role-less folder `docs/planning/10-paper-vs-repo-gap.md` flagged is gone; verified absent from the current tree. No action needed.
- [x] **RESOLVED 2026-08-11** — real `npm run lint` run on all three Next.js apps; clean apart from intentional `no-console` in kiosk_web. Original scope: **ESLint `@eslint/compat` gap** — `docs/planning/10-paper-vs-repo-gap.md` (2026-03-15) reported `npm run lint` failing in both Next apps over a missing `@eslint/compat` import. Not found in either `package.json` on a 2026-08-10 grep, which likely means it was already resolved during the Knip dependency-prune pass — confirm with a real `npm run lint` run rather than trusting the absence of a string match.
- [x] **WORKING since 2026-08-11** and used heavily since for live screenshot verification. **Still not done:** running `/design-review` and `avoid-ai-design` as their own formal passes. Original scope: **Playwright MCP for `/design-review`** — explicitly flagged as not-yet-installed in `docs/planning/02-design-mandate.md`'s own execution-status list. Needed before the hardened screenshot-verification loop in `02-design-mandate.md` §0 can actually run automated, not manual, screenshot checks.

---

## Cross-cutting: definition of done

No item is ticked until:

1. Verified against **real running code/hardware**, not narrated as "should work."
2. `docs/planning/08-master-checklist.md`, `docs/planning/02-design-mandate.md`, and `memory.md` updated to match.
3. If a fault/failure path is claimed covered, it was actually exercised — not just the happy path.
