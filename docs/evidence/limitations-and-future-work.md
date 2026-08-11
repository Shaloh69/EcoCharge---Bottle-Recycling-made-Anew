# EcoCharge — Limitations and Future Work

Part of the thesis evidence pack (`docs/planning/08-master-checklist.md` Phase H). Written from the real, current state of `08-master-checklist.md` as of 2026-08-11 — every item below is a genuine, tracked gap, not a hedge invented for the thesis. A defensible thesis states what isn't done as plainly as what is.

---

## 1. Design decisions, made deliberately — not gaps, but worth stating why

- **Guest deposits credit a single shared pooled account**, not individual guest tracking. Mitigated with a per-IP rate limiter (5 sessions / 15 min, 30 actions / 15 min) rather than redesigning the account model. Accepted tradeoff: simplicity over per-guest attribution, since guest credits are explicitly non-transferable to a later registered account anyway.
- **Device-key comparison is a database lookup, not constant-time.** A timing side-channel exists in theory. Accepted because kiosks are deployed on infrastructure the team physically controls — a real risk model for a public-internet API, a low-priority one for a fleet the operator owns.
- **The AI detection pipeline is a two-stage design** (YOLO26 detection → EfficientNet-B0 classification) with independent confidence thresholds at each stage (the AI server's 0.40 detection floor, the kiosk's separate 0.5 accept floor) — **this specific mismatch is an open item, not a settled decision** (see §2).

## 2. Genuinely open decisions — not yet made, not inferable from code

- **The `ml-review` gate**: low-confidence detections are currently a retrospective audit trail (credits awarded immediately, an admin can spot-check afterward) rather than a hold-for-review gate. Both are legitimate product designs; which one EcoCharge actually intends has never been decided. Building the alternative (deferred credit award, a new pending-review state, admin approve/deny actions) is real, non-trivial feature work that shouldn't be built speculatively in either direction.
- **The AI confidence floor mismatch** (0.40 detection vs. 0.5 accept) — plausibly intentional (a "detected but not confident enough" band that funnels to `ml-review`), plausibly just drift between two thresholds that were never reconciled. Not resolved.
- **Key rotation**: the device API key and AI API key are both present in this repo's git history (in `esp/ecocharge/include/config.h`), which means they must be treated as compromised regardless of current validity. Rotating them needs to happen together with reflashing the ESP32 — not yet done, and not safely doable at all while the hardware is physically unreachable (see §3).

## 3. Hardware access — the largest practical constraint on this session's work

Neither the ESP32 nor the physical kiosk has been reachable at all during this development period. Concretely, this means:

- **The two proposed firmware fixes** (a `SCANNING`-state timeout so an unreadable object doesn't nudge the conveyor forever, and a debounced re-check so one missed ultrasonic reading doesn't wrongly reject a bottle that actually landed) are implemented in source and reviewed, but **never flashed or bench-tested against real hardware.**
- **Hardware validation** (relay clicks, overcurrent trip, conveyor forward/reverse/fast-forward, real sensor readings in telemetry) has not happened.
- **One of the five planned end-to-end fault-path tests — "backend unavailable, ESP32 retries and stays fail-safe" — could not be automated at all.** That's firmware retry/fail-safe logic, not server behavior; it needs either the real device or a firmware simulator that doesn't exist. The other four fault paths (happy path, overcurrent reflection, bin-full rejection, stale-session sweep) do have real, passing integration tests.
- **Key rotation** (§2) is blocked on this same constraint.
- **Pilot deployment findings** (the paper's stated UC Lapu-Lapu and Mandaue context) cannot exist yet — a pilot needs working, validated hardware first.

## 4. AI model — real, strong results with honestly-scoped caveats

The bottle detector (YOLO26) finished training with strong held-out test-set results: mAP50 0.9950, mAP50-95 0.9447, Precision 0.9988, Recall 1.0000 (full detail: `docs/evidence/ml-evaluation-report.md`). Real caveats, not hedging:

- **Small test set** (79 images) — wide confidence intervals on these numbers.
- **Single-source dataset**, no cross-dataset validation. A second, collaborator-provided dataset (`magical-nightingale`) was found registered but never pulled in or merged — explicitly deprioritized in favor of the existing dataset's built-in augmentation.
- **The classifier (brand/volume/condition) was not retrained this session** — it's still running on its original weights, with no fresh evaluation numbers to report.
- These are detector metrics against a curated dataset, not field accuracy on the real kiosk under real lighting/conveyor conditions — that data doesn't exist yet (tied to §3).

## 5. Design revamp — real, substantial, honestly incomplete

The design mandate (`02-design-mandate.md`) requires every visual change to be screenshot-verified against a real running instance before being marked done — a rule that exists precisely because an earlier pass in this project's history checked items off on a passing build alone, which later proved wrong in ways only a screenshot would have caught (documented in `docs/planning/02-design-mandate.md`'s own "Correction, 2026-08-11" note).

- **A first real design-review pass on the Admin Console** (forensic method — real API/HTML inspection, not actual screenshots, since the screenshot tooling wasn't available yet) found and fixed three genuinely live bugs: the offline-kiosk alert banner had a severity-vocabulary mismatch and had never fired once; a missing timestamp field silently rendered `"Invalid Date"`; the kiosk list hardcoded a bin-level gauge to zero instead of reading real data.
- **The same pass also found, and deliberately left unfixed**, a systemic problem: reflexive glassmorphism and banned decorative gradients present on every route, including the login page (three separate gradients — logo, wordmark, submit button), which the Mantine-based rebuild never touched at all. Fixing this correctly needs the actual screenshot-verification loop.
- **Playwright MCP (the tool that loop needs) was registered this session but isn't usable yet** — a session-restart limitation, not a skipped task (`memory.md`, 2026-08-11).
- **The Kiosk Web component catalog** (a battery-shaped bin gauge, station-picker grid, on-screen keypad, OTP bottom-sheet, success/fail halo badge, wave-divider shape language) — the largest concrete visual gap — has not been built.
- **The Mobile App's screen-by-screen animation pass** is blocked on the Flutter SDK not being available in this development environment at all; needs either that installed here or manual verification by whoever has it.
- **The Public Website** is built but not yet screenshot-verified.

## 6. Testing — real coverage added this session, with stated scope limits

Before this session, this repository had no test infrastructure at all — no test runner, no test files, in any of the three code surfaces. Added: 11 unit tests (rate limiting, auth) and 4 end-to-end integration tests (the real happy path plus 3 of the 4 automatable fault paths) on the backend, 7 tests on the AI inference service. Real, passing, checkable coverage — but genuinely partial: no frontend component tests on any of the three web/mobile surfaces, no load/performance testing, and (per §3) no hardware-in-the-loop testing.

## 7. What this adds up to, stated plainly

The system is self-hosted, live, and functionally working end-to-end at the API layer, with a real trained detector and real automated test coverage where automation is possible at all. What's genuinely not done, in order of how much it would take to close: the visual design revamp (needs tooling that's one session-restart away, then real design-iteration time), hardware validation and the two paused firmware fixes (needs physical access this development period never had), and two product decisions (`ml-review` gate direction, confidence-floor reconciliation) that are legitimately not code questions. None of these are hidden — `docs/planning/08-master-checklist.md` tracks every one with an honest status marker, kept current as the actual source of truth rather than left to drift.
