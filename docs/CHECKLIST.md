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
| 6 — Kiosk UI (`client/kiosk_web`) | **Functional, design pending** — real flows against the live API; visual rebuild per the design mandate not yet started. | `docs/planning/02-design-mandate.md` §4, `docs/planning/04-continue-design-redo.md` |
| 6 — Admin dashboard (`client/web_console`) | **Functional, design pending** — same as above. | `docs/planning/02-design-mandate.md` §3 |
| 7 — Mobile app (`client/flutter_app`) | **Delivered, design pending** — real screens, real API integration, no visual redesign yet, no notifications feature. | `docs/planning/02-design-mandate.md` §5 |
| — Public website (`client/web`) | **Not started — doesn't exist in the repo yet.** New surface added 2026-08-10: promotional site, changelog, public docs, app download. Template: Velora UI. | `docs/planning/02-design-mandate.md` §6 |
| 8 — Testing, validation, thesis evidence | **Not started** — no automated tests anywhere in the repo (backend, AI server, or Flutter app), no e2e scripts, no thesis evidence pack assembled. The one phase where nothing has changed since the original March 2026 plan. | `docs/planning/05-feature-build-checklist.md` Stages 1 & 3 |
| — Self-hosting migration | **Target machine + architecture confirmed, execution not started.** Still on Aiven MySQL, Supabase Storage, Render hosting, and a rotating Cloudflare quick-tunnel for the AI server (unchanged). Target machine is `desktop-gklhcri` (confirmed 2026-08-10 via Tailscale); storage moves to Disk D under a structured `D:\EcoCharge\` layout; MySQL and Supabase both run in Docker, with Supabase self-hosted (not replaced). Not a phase in the original plan; the single largest remaining piece of work now. | `docs/planning/03-revamp-master.md` §1 |

---

## Open product/process decisions — not code gaps, need a person to decide

These block specific downstream work and shouldn't be guessed at:

- **`ml-review` gate** — should a low-confidence AI detection hold credits pending human review, or stay the current retrospective audit trail? (`docs/planning/03-revamp-master.md` §3.1)
- **Firmware fix values** — `BOTTLE_SCAN_TIMEOUT_MS`/`BOTTLE_BIN_RECHECK_MS` proposed in `AUDIT.md`, need explicit approval before any flash.
- **Backend stack divergence** — update the thesis paper to describe Node/Express, or document the Flask-to-Node divergence explicitly as a design decision (`docs/PROJECT_ANALYSIS.md`).
- **Mascot character** — the premade Figma designs (reviewed 2026-08-10, see `memory.md`) use fan art of an existing copyrighted character ("© Genshin Impact" credited in the file). Cannot ship publicly as-is. Needs an explicit decision: commission/generate an original character in the same style, or a different direction entirely.
- **Language scope** — the reviewed designs include a language switcher; which languages beyond English isn't decided (Bisaya/Cebuano is the obvious candidate given the deployment context, not yet confirmed).

Already decided, don't re-ask: self-hosting target machine (`desktop-gklhcri`, Disk D, Docker MySQL + self-hosted Supabase), guest pooled balance (kept, rate-limited), device-key timing (accepted as-is). Full reasoning in `memory.md`.
