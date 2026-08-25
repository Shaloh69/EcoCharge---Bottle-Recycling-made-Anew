# EcoCharge Project Plan

**Update, 2026-08-11: two of this document's "still open" claims below are now resolved — self-hosting migration is done (Docker MySQL + Node API + admin console + AI server all live on `desktop-gklhcri`, Aiven/Supabase/Render decommissioned) and testing infrastructure now exists (`vitest`/`pytest`/a real E2E integration suite). Both corrected inline below rather than left contradicting `docs/planning/08-master-checklist.md`, which is the live tracker for both.**

**Refreshed 2026-08-10.** The original plan (written when `server/server_main`/`server/server_AI` were empty scaffolds) has been substantially executed — Phases 0–5 are done, Phase 6 is functionally done but not yet visually redesigned, Phase 7 is resolved and built. This refresh marks each phase's real status and points to the documents that now track the remaining detail live (`docs/planning/09-system-analysis.md`, `docs/planning/11-audit-findings.md`, `docs/planning/03-revamp-master.md`, `docs/planning/05-feature-build-checklist.md`) rather than re-listing every task here — dual-maintaining the same checklist in two places is exactly the kind of drift this refresh pass exists to close. Where a phase is done, this file states that plainly and moves on; where it isn't, the detail lives in the newer docs and this file links to it.

## Purpose

Turn the thesis scope and the repository state into one implementation roadmap. Unchanged from the original.

## Planning Principles

Unchanged: build toward one system, keep the paper and repo aligned (or document the divergence explicitly), finish the critical path first, keep every feature traceable to a thesis objective, favor a smaller finished product over a larger fragmented one.

## Primary End State

Unchanged, and **now achieved at the code level**: a user can authenticate/start a kiosk session, deposit a bottle, have it detected and classified, receive credits, select a charging port, charge for the correct duration, see transaction feedback, and admins can monitor usage/credits/kiosk health. Verified end to end in `docs/planning/09-system-analysis.md` §6–§7. What's *not* yet achieved is the operational surrounding: self-hosting, visual design, and evidence/testing — see Phase 8 below.

## Phase 0: Alignment And Scope Freeze — **done**

- Official architecture: **not** what was originally frozen here (Flask+MySQL on Render, FastAPI on RunPod) — the actual backend was built in Node/Express/TypeScript/Prisma instead, currently hosted on Render with the AI server on a local PC behind a Cloudflare tunnel. This is a real divergence from the original freeze, not an update to it — see the open item below.
- YOLO26 confirmed official (unchanged decision, 2026-03-15).
- Flutter mobile app confirmed in scope — and, as of this refresh, actually built and API-integrated, not just scoped.
- Credit model as originally decided: 1 bottle = 1–3 credits (volume-tiered, not flat), 1 credit = editable minutes of charging via `SystemSetting` (originally simpler, now more flexible than the freeze anticipated).
- ESP32 communication: confirmed as originally planned — polls the API over WiFi STA mode, never receives inbound connections.
- Hardware: **more than originally confirmed** — the freeze said 1 servo, 4 relays, 4 current/voltage sensors; the real build is a conveyor (not a servo trapdoor) plus 3× ultrasonic sensors plus **a second ESP32** acting as a sensor node for the analog channels one ESP32 alone cannot cover while WiFi is active (rev 3.0.0, 2026-08-20 — this replaced an earlier Raspberry Pi Pico bridge), plus a WiFi reset button.

**Still open from this phase, genuinely unresolved:**
- [ ] **Backend stack divergence (Flask → Node) needs a thesis-narrative decision** — update the paper to describe the real stack, or explicitly document the divergence as a design decision. Tracked in `docs/planning/10-paper-vs-repo-gap.md`'s software-stack table.
- [ ] Formal architecture diagram (draw.io or similar) — tracked in `docs/planning/05-feature-build-checklist.md` Stage 3.
- [ ] Thesis narrative updated for YOLO26 (replace YOLOv8 references) — decided 2026-03-15, completion not independently re-verified.

## Phase 1: Repository Cleanup And Structural Setup — **done**

- `client/kiosk_web` is the kiosk UI, `client/web_console` is the admin dashboard, `client/flutter_app` is the mobile app — roles unambiguous, both web apps are distinct real products now, not duplicate templates.
- `server/server_main` and `server/server_AI` are real, implemented projects.
- `client/kiosk_electron` (the empty, role-less folder the original repo audit flagged) — **gone**, confirmed absent from the current tree.
- Dead code removed: the Flask prototype (`server_main/app/`), `flutter_app`'s scaffold-era `mock_data.dart`, and 27 Knip-verified unused files across both Next.js apps.
- ESLint `@eslint/compat` — not found in either app's `package.json` as of this refresh, likely resolved incidentally during the dependency prune; **verify with a real `npm run lint` run** rather than trusting the absence of a string match.

**Still open:** [ ] Root `README.md` — still doesn't exist. Tracked in `docs/planning/05-feature-build-checklist.md` Stage 4; write it once the self-hosting migration lands so it documents real run commands instead of Render-era ones needing an immediate rewrite.

## Phase 2: Backend And Data Foundation — **done, different stack than planned**

All the capabilities this phase called for (accounts, login/registration, transaction history, credit balance, kiosk sessions, bottle deposits, charging sessions, device telemetry, admin reporting) are implemented — in Node/Express/Prisma, not the Flask backend this phase originally specified. Full endpoint and schema inventory: `docs/planning/09-system-analysis.md` §4 and §8. The original phase's task list (`flask db migrate`, `flask db upgrade`, Render env vars for a Flask deploy) no longer applies — Prisma migrations run automatically at server startup with self-healing logic (`src/startup.ts`), already verified working.

## Phase 3: Machine Learning Productization — **done**

`server/server_AI` is a real FastAPI service with the trained weights actually deployed (`models/best_detector.pt`, `models/best_classifier.pt` — both present, confirmed this refresh). `POST /api/detect` and `GET /health` are real and live. Hosting is a local PC behind a Cloudflare quick tunnel — functional but not yet the stable named-tunnel setup the self-hosting migration calls for (`docs/planning/03-revamp-master.md` §1.2).

**Not done:** benchmark inference latency on the actual target/deployment hardware; a formal model-evaluation report tying mAP/precision/recall to thesis acceptance criteria — tracked in `docs/planning/05-feature-build-checklist.md` Stage 3.

## Phase 4: Firmware And Hardware Integration — **done, two edge cases open**

Every hardware responsibility this phase called for is implemented: relay control for charging ports, current sensing, ultrasonic bin-fullness sensing, conveyor actuation (the design uses a conveyor rather than the servo/trapdoor concept originally scoped — a real, worth-stating-explicitly design decision), a real host-device HTTP polling protocol, structured telemetry, and fail-safe behavior (relays confirmed to default OFF on any reboot, `relay_control.c:43`).

**Still open, exact fix values already proposed in `docs/planning/11-audit-findings.md`, pending sign-off before flashing:**
- [ ] `SCANNING` state has no timeout (conveyor can nudge indefinitely under specific failure conditions)
- [ ] `CONFIRMING` state doesn't re-check the bin sensor before finalizing a reject
- [ ] Device/AI API key rotation (currently committed in firmware history, must be treated as compromised)

Full technical detail: `docs/planning/03-revamp-master.md` §2–§3.

## Phase 5: Local Kiosk Orchestrator — **done, different shape than planned**

This phase assumed a separate orchestrator service. **Confirmed in `docs/planning/09-system-analysis.md`: there isn't one, and the system doesn't need one** — the kiosk web app's browser *is* the orchestrator. It calls the AI server directly (via its own server-side `/api/detect` proxy, keeping the AI key off the client) and the Node API directly, manages the session flow client-side, and reacts to SSE events for bin confirmation and charging status. This satisfies the phase's actual goal (camera inference, device control, user flow, and backend communication coordinated from one place) without the extra service the original plan assumed would be necessary.

## Phase 6: Kiosk UI And Admin Dashboard — **functional, not yet visually redesigned**

Both apps are real, live, and wired to the real backend — the original phase's "replace placeholder UIs" framing is obsolete, since neither is a placeholder anymore. What was left is the visual design execution specified in `docs/planning/02-design-mandate.md` ("Operations Console" for the admin dashboard, "Clean Energy Reward" for the kiosk). **Update 2026-08-11: that execution has now largely landed on both surfaces** — real typography swap (Baloo 2 / Space Grotesk / IBM Plex families wired via `next/font`, Inter gone), Mantine rebuild across all 11 admin pages, a systemic light-identity fix plus a real component catalog on the kiosk, and an FSM-aware idle timeout. Track the live per-item status in `docs/planning/08-master-checklist.md` Phase E, not here.

## Phase 7: Mobile App Decision And Delivery — **resolved: kept, and built**

Option A (keep Flutter in scope) was chosen and executed — further than this phase's own task list describes. Login/registration, credit balance, transaction/deposit history, kiosk-QR scan, and charging view/stop are all real and API-integrated (`docs/planning/09-system-analysis.md` §13). **Not done:** notifications/alerts (not found in the current screen inventory), and — same as the other two surfaces — the visual redesign per `docs/planning/02-design-mandate.md` §5.

## Phase 8: Testing, Validation, And Thesis Evidence — **testing infra done 2026-08-11, evidence pack partially done**

**Corrected 2026-08-11 — this phase is no longer "not started."** Real test infrastructure now exists: `vitest` for the backend (11 tests covering rate limiting and auth), `pytest` for the AI server (7 tests against the real loaded models), and a real E2E integration suite (`server_main/src/__tests__/e2e.integration.test.ts`) running against a genuinely isolated test database, covering the happy path and 3 of 4 scoped fault paths. Thesis evidence pack: architecture diagram, hardware wiring diagram, ML evaluation report, and a limitations/future-work section are all done; UI screenshots, user testing summary, and pilot deployment findings remain open. **Full current detail lives in `docs/planning/08-master-checklist.md`** (Phases G and H) rather than duplicated here — that document tracks it with live status, this one won't be kept in sync with it going forward.

Required validation scenarios (unchanged from the original plan, still all open): accepted bottle flow, rejected bottle flow, low-confidence detection flow (**blocked on a real product decision first — see `docs/planning/03-revamp-master.md` §3.1, whether `ml-review` should gate credit award or stay retrospective**), insufficient credit flow, charging start/timeout flow, current sensor abnormality flow, full bin flow (partially covered server-side already — the `409 bin_full` guard is real), ESP32 disconnect flow (partially covered — the stale-session sweep is real and tested informally, not yet under a real test script), backend unavailable flow.

## Workstream Backlog By Area — current state

### Machine Learning — mostly done
Dataset and label policy documented in `docs/planning/12-self-hosting-guide.md`; production model versions frozen (YOLO26); inference behind a stable interface (`POST /api/detect`). **Not done:** a defined rejection/confidence policy beyond the existing 0.40 detection threshold and 0.70 ml-review flag threshold — worth confirming these are the final, intentional values rather than leftover defaults.

### Firmware — done except the two flagged edge cases
Relay control, sensor modules, a real HTTP polling protocol, and fail-safe behavior are all implemented. Two specific gaps remain, both scoped with exact proposed values — see Phase 4 above.

### Backend — done
Service, schema, auth, credits ledger, charging session logs, admin APIs — all real.

### Kiosk UI / Admin Dashboard — functional, design pending
See Phase 6.

### Mobile — done, design pending
See Phase 7.

### DevOps And Quality — the real gap
Standardized build commands: partially true (each service has its own `package.json`/`requirements.txt`/PlatformIO project, no unified root-level command yet — root `README.md`, still missing, is where this would live). Test scripts: **absent, see Phase 8.** Environment examples: present (`*.env.example` files exist per service). Large-artifact separation: `runs/` is still committed to the working tree, unchanged from the original finding.

## Recommended Milestone Order (refreshed)

The original 10-step order (scope freeze → backend → orchestrator → firmware → ML → kiosk UI → admin dashboard → integration test → pilot → evidence) is **effectively complete through step 7** — what's left is a different order than the original plan anticipated, because the remaining work isn't sequential build-out anymore, it's operationalization:

1. ~~Self-hosting migration (`docs/planning/03-revamp-master.md` §1) — blocks a real pilot deployment.~~ **Done 2026-08-11** (`docs/planning/08-master-checklist.md` Phase A). **But see the 2026-08-12 entry in `memory.md`**: the deployed services did not survive the machine reboot on 2026-08-11 (a Scheduled-Task registration defect), so "migrated" is not yet the same as "durably running".
2. Key rotation + the two firmware fixes (same document, §2–§3) — blocks safely reflashing hardware.
3. The `ml-review` gate product decision (§3.1) — blocks writing the "low-confidence detection flow" test in Phase 8.
4. Design revamp execution (`docs/planning/02-design-mandate.md`, tracked live in `docs/planning/08-master-checklist.md` Phase E) — blocks taking the UI screenshots the thesis evidence pack needs.
5. Testing infrastructure (`docs/planning/05-feature-build-checklist.md` Stage 1) — blocks a defensible "the system works reliably" claim.
6. Thesis evidence packaging (same document, Stage 3) — the actual final deliverable.
7. Pilot validation — depends on 1 and 2 being done first; a pilot on unmigrated, unvalidated hardware would produce findings about the wrong system.

## Definition Of Done (refreshed)

EcoCharge should be considered complete only when all of these are true:

- ~~the thesis architecture and the repository architecture match~~ — **the repo now has more architecture than the original freeze specified in some places (conveyor vs. servo, Node vs. Flask) — the remaining requirement is that the thesis narrative honestly describes what was actually built, not that the repo conforms to the original freeze.**
- the kiosk accepts or rejects bottles through real ML inference — **done**
- credits or charging access are recorded in a real backend — **done**
- charging hardware is controlled safely through the ESP32 — **done**, two edge-case fixes pending
- kiosk UI is fully implemented — **functionally done, visual redesign pending**
- admin monitoring is fully implemented — **functionally done, visual redesign pending**
- mobile scope is either delivered or formally removed — **delivered**
- end-to-end tests exist — **not started**
- pilot evidence exists — **not started, blocked on hardware validation** (self-hosting itself landed 2026-08-11; its persistence across reboots is a separate open problem, see `memory.md` 2026-08-12)
- the system can be demonstrated as one integrated product — **already true today**, even before the remaining items above are finished

## Final Planning Note (refreshed)

The original note — "the project does not need more isolated prototypes right now, it needs integration, scope discipline, and a finished core workflow" — has been acted on. That work is done. The equivalent note for this refresh: **the project doesn't need more feature-building right now — it needs to get off borrowed infrastructure, finish the two hardware decisions still waiting on sign-off, execute the design system that's already specified, and build the evidence base a real defense requires.** Track all four against `docs/planning/03-revamp-master.md` and `docs/planning/05-feature-build-checklist.md` going forward — those are now the live-tracked documents, not this one.
