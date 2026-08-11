# EcoCharge Implementation Checklist

**Refreshed 2026-08-10.** This file previously duplicated a full phase-by-phase checkbox list that also lived in `PROJECT_PLAN.md`. Both were still describing a Flask backend that was later rebuilt in Node/Express/Prisma, and both had drifted out of sync with each other. Rather than maintain the same checklist in three places (this file, `PROJECT_PLAN.md`, and the newer `docs/planning/05-feature-build-checklist.md`), this file is now a one-screen status board with pointers to whichever document actually tracks the detail live. Update the status column here when a phase's state changes; update the itemized detail in the linked document, not here.

**How to read the status column:** Done = verified against real code/deployment, not narrated. Partial = some real evidence exists, real gaps remain, named explicitly. Not started = confirmed absent by direct check, not assumed.

---

| Phase | Status | Detail lives in |
|---|---|---|
| 0 — Alignment & scope freeze | **Partial** — architecture actually diverged from the freeze (Node not Flask, conveyor not servo) rather than following it; needs a thesis-narrative decision, not more code. YOLO26 confirmed official. | `PROJECT_PLAN.md` Phase 0 |
| 1 — Repository cleanup | **Done** — dead code removed (Flask prototype, scaffold mock data, 27 Knip-verified unused files), folder roles unambiguous. Root `README.md` still missing. | `PROJECT_PLAN.md` Phase 1 |
| 2 — Backend & data foundation | **Done** — real Node/Express/Prisma API, all major route groups, auto-migrating schema. Built in a different stack than originally planned. | `analyzation.md` §4, §8 |
| 3 — ML productization | **Done** — real FastAPI inference service, trained weights deployed and in use. Hosting still on a rotating quick-tunnel, not yet stable. | `analyzation.md` §12 |
| 4 — Firmware & hardware | **Done, two fixes pending sign-off** — full hardware role implemented (relays, sensors, conveyor, telemetry). `SCANNING` timeout and `CONFIRMING` bin-recheck proposed with exact values, deliberately not yet flashed. | `AUDIT.md`, `docs/planning/03-revamp-master.md` §3.2–§3.3 |
| 5 — Kiosk orchestration | **Done** — no separate orchestrator process exists or is needed; the kiosk web app's browser fills this role directly, confirmed against real code. | `analyzation.md` §3, §6 |
| 6 — Kiosk UI (`client/kiosk_web`) | **Full redo in progress, 2026-08-11** — real flows against the live API; visual rebuild being executed against researched external references (deck is mascot-only per user instruction). | `docs/planning/02-design-mandate.md` §4, `08-master-checklist.md` Phase E2 |
| 6 — Admin dashboard (`client/web_console`) | **Full redo in progress, 2026-08-11** — same as above; the first pass produced a generic centered auth card, which is exactly what §2 bans. | `docs/planning/02-design-mandate.md` §3, `08-master-checklist.md` Phase E1 |
| 7 — Mobile app (`client/flutter_app`) | **Full redo in progress, 2026-08-11** — real screens, real API integration; animation stack installed and compiling, screen-by-screen rebuild underway. | `docs/planning/02-design-mandate.md` §5, `08-master-checklist.md` Phase E3 |
| — Public website (`client/web`) | **Built, 2026-08-10** — real pages (home, how-it-works, changelog, docs, about, download), all 6 routes build clean. Not yet screenshot-verified or publicly deployed/tunneled. Template reference corrected 2026-08-11 (was citing the same template EngiRent used — see `memory.md`). | `docs/planning/02-design-mandate.md` §6, `08-master-checklist.md` Phase E4 |
| 8 — Testing, validation, thesis evidence | **Testing infra built 2026-08-11** — `vitest` (backend, 11 tests), `pytest` (AI server, 7 tests), and a real E2E integration suite against an isolated test DB. Thesis evidence pack partially assembled (architecture/hardware-wiring diagrams, ML evaluation report, limitations section all done); UI screenshots, user testing, and pilot findings still open. | `docs/planning/08-master-checklist.md` Phases G & H |
| — Self-hosting migration | **Done, 2026-08-11 — corrected from the stale claim below.** Docker MySQL (not Supabase, not native), Node API, admin console, and AI server all live on `desktop-gklhcri` as persistent Task-Scheduler services, each on its own public Cloudflare quick tunnel. Aiven, Supabase (cloud and self-hosted), and Render are all fully decommissioned, not just planned for decommissioning. Media stored locally on the host, not Supabase Storage. | `docs/planning/08-master-checklist.md` Phase A |

---

## Open product/process decisions — not code gaps, need a person to decide

These block specific downstream work and shouldn't be guessed at:

- **`ml-review` gate** — should a low-confidence AI detection hold credits pending human review, or stay the current retrospective audit trail? (`docs/planning/03-revamp-master.md` §3.1)
- **Firmware fix values** — `BOTTLE_SCAN_TIMEOUT_MS`/`BOTTLE_BIN_RECHECK_MS` proposed in `AUDIT.md`, need explicit approval before any flash.
- **Backend stack divergence** — update the thesis paper to describe Node/Express, or document the Flask-to-Node divergence explicitly as a design decision (`docs/PROJECT_ANALYSIS.md`).
- **Language scope** — the reviewed designs include a language switcher; which languages beyond English isn't decided (Bisaya/Cebuano is the obvious candidate given the deployment context, not yet confirmed).

Already decided, don't re-ask: self-hosting target machine (`desktop-gklhcri`, Disk D, Docker MySQL + self-hosted Supabase), guest pooled balance (kept, rate-limited), device-key timing (accepted as-is), **mascot (keep the Genshin-inspired art, credit it as inspiration, not a blocker)**, **component library (HeroUI dropped entirely — Mantine for Admin Console, shadcn/ui+Radix/Base UI for Kiosk Web)**, **AI training runs on `desktop-gklhcri`** (explicit user override — the GPU-based recommendation was `minniedumpor`, but the instruction was to train on the self-hosting target machine instead; a real CPU training run is in progress there as of 2026-08-10, ~80 epochs), **`magical-nightingale` dataset merge dropped** (no HUB credentials, user said to proceed without it). Full reasoning in `memory.md`.
