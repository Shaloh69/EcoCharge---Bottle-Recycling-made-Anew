# EcoCharge — Cross-Session Memory

Decisions made across sessions that aren't recoverable by reading the code alone — the record of *why*, not *what* (the code and `analyzation.md`/`AUDIT.md`/`DESIGN.md` are the source of truth for "what exists"). Read this before re-litigating something that was already decided. Add an entry here whenever a non-obvious call gets made, instead of leaving it to live only in chat history.

---

## 2026-08-10 — `docs/planning/` was contaminated with a different project's content; consolidated

**What happened:** `docs/planning/00-start-here.md` through `06-must-have-app-features.md` (7 files) were entirely written for **EngiRent Hub** — a separate, unrelated thesis project (a student rental-kiosk marketplace: PayMongo escrow payments, facial recognition, Flutter + Next.js + lockers). None of it referenced EcoCharge. The folder was untracked in git, so it was very likely copied wholesale from a sibling repo as a structural template and never adapted.

**Why it matters:** anyone (human or a future Claude Code session) opening `docs/planning/` would get actively wrong context — wrong tech stack, wrong domain, wrong file paths — for a reverse-vending kiosk project.

**Decision:** consolidate, don't duplicate. `docs/planning/` now holds the *directive/prompt* layer (audit methodology, design mandate, master revamp prompt, continuation prompt, forward checklists) rewritten for EcoCharge. The *deliverable/ground-truth* layer stays at repo root: `analyzation.md` (audit output), `AUDIT.md` (findings + firmware fix proposals), `DESIGN.md` (design tokens + execution-status tracker), this file. Content that was living only in two untracked root files — `ECOCHARGE_FULL_REWORK_PROMPT.md` and `ECOCHARGE_KIOSK_HARDWARE_CLARIFICATIONS (1).md` — was migrated into `docs/planning/03-revamp-master.md` (and relevant pieces into `02-design-mandate.md`) and those two root files were then deleted, since their content now lives in `planning/` and duplicating it at root would just recreate the same "two sources of truth" problem this cleanup exists to fix.

`docs/CHECKLIST.md`, `docs/PROJECT_ANALYSIS.md`, and `docs/PROJECT_PLAN.md` were also refreshed in the same pass — they predate the real backend (written when `server/server_main`/`server/server_AI` were empty scaffolds, describing a planned Flask stack) and were stale against the actual Node/Express/Prisma system `analyzation.md` later verified.

**How to apply:** when picking up planning work, start at `docs/planning/00-start-here.md`. Treat `analyzation.md` as ground truth for what the code does today; treat `AUDIT.md` as the running findings/fix log; treat `DESIGN.md` as the design system's as-built state. Don't recreate a second copy of the master rework prompt at root — extend `docs/planning/03-revamp-master.md` in place instead.

---

## 2026-08-10 — Self-hosting target machine confirmed: `desktop-gklhcri`, plus a real architecture change

**What happened:** the user confirmed the self-hosting target machine directly, corroborated with a Tailscale admin console screenshot showing two distinct online Windows devices — `minniedumpor` (the day-to-day dev machine, `dumporshemjoshua@gmail.com`) and `desktop-gklhcri` (`ecocharge123@gmail.com`, a dedicated account consistent with this being the intended standing server). This resolves the ambiguity `AUDIT.md` originally flagged as blocking (the prompt said `desktop-gklhcri`, the dev machine identified itself as `MINNIEDUMPOR`, and a later addendum claimed resolution without ever writing down the answer).

**The user also changed the migration's storage architecture from what `03-revamp-master.md` originally specified:**
- **Storage lives on Disk D**, not C — D: has materially more free space on `desktop-gklhcri`. A full folder layout under `D:\EcoCharge\` is now specified (`03-revamp-master.md` §1.0).
- **MySQL runs in Docker**, not as a native Windows install — a `mysql:8` container with an explicit bind mount to `D:\EcoCharge\mysql\data`.
- **Supabase is self-hosted via Docker, not dropped.** The original plan called for replacing Supabase Storage entirely with hand-built local disk storage + custom signed-URL routes. The new plan self-hosts the actual `supabase/docker` stack on `desktop-gklhcri` instead — the app's existing Supabase-REST-API integration code (`storageService.ts`) stays structurally the same, just repointed at the local instance's URL and a newly-generated service-role key. Self-hosted Supabase brings its own internal Postgres (for its own Auth/Storage/Realtime bookkeeping) — this is separate from and does not replace the app's MySQL/Prisma database; the two coexist for unrelated reasons.

**Why it matters:** this is materially less rework than the original plan (repoint vs. rebuild), and it's a real, deliberate change — not a detail to silently keep evaluating both options for. Full technical detail: `03-revamp-master.md` §1.

**How to apply:** don't re-ask which machine, don't propose native MySQL or a from-scratch local-storage rebuild — both were superseded by this decision. If picking up the migration, start at `03-revamp-master.md` §1.0 (folder layout) and work through §1.6 in order.

---

## 2026-08-10 (from prior session, recorded here retroactively) — Self-hosting migration (rework §1) has not started

Verified directly against `server/server_main/.env` this session: `DATABASE_URL` still points at Aiven (`*.aivencloud.com`), `SUPABASE_URL` is still set, `ALLOWED_ORIGINS` still lists `*.onrender.com`, and `AI_SERVER_URL` is still a rotating `*.trycloudflare.com` quick-tunnel URL. The 2026-08-10 commits ("rework steps 2-7...") explicitly did **not** include step 1 (self-hosting migration onto `desktop-gklhcri`) despite `ECOCHARGE_KIOSK_HARDWARE_CLARIFICATIONS.md` reporting the tailnet blocker resolved.

**Why it matters:** don't assume the system is self-hosted because a later doc says the blocker was cleared — clearance of the blocker and execution of the migration are two different events, and only the first happened.

**How to apply:** treat Section 1 of `docs/planning/03-revamp-master.md` as fully open. Before doing anything else in that section, confirm with the user which machine is actually the target (`AUDIT.md`'s original blocker: the prompt said `desktop-gklhcri`, the actual dev machine identified itself as `MINNIEDUMPOR` — never explicitly reconciled in writing, only implied resolved).

---

## 2026-08-09/10 — Firmware fixes proposed but deliberately not flashed

`AUDIT.md` contains exact proposed values for two firmware fixes (`BOTTLE_SCAN_TIMEOUT_MS=60000`, `BOTTLE_BIN_RECHECK_MS=4000` + 3-sample debounce) grounded in the physical hardware description in the (now-migrated) hardware-clarifications addendum. Verified this session via grep: **neither constant exists in `esp/ecocharge` yet** — nothing has been flashed. This is intentional, not an oversight: both change physical conveyor/relay-adjacent behavior, and the standing rule (`03-revamp-master.md`) is that physical-behavior changes get proposed with exact values and wait for explicit user sign-off before any flash, same treatment as the emergency-stop-class hardware changes on sibling projects.

**How to apply:** don't flash `bottle_fsm.c` changes without the user explicitly approving the specific timeout/sample values first. If the values need revisiting, propose new ones in `AUDIT.md`, don't silently change them in code.

---

## 2026-08-10 — Guest pooled balance and device-key timing: accepted as-is, not redesigned

Two items `analyzation.md`/`AUDIT.md` flagged as worth reconsidering post-migration were explicitly resolved by the user (recorded in the now-migrated hardware-clarifications addendum, carried forward here so the decision survives the file's deletion):
- **Guest pooled balance** stays the current design (all guest deposits credit one shared `guest@kiosk.local` account). Mitigation is a per-IP rate limit on guest session/deposit/charging-start endpoints, not a redesign of the account model. Rate limiting shipped 2026-08-10 (`rework steps 2-7` commit).
- **Device-key timing** (DB lookup, not constant-time compare) stays as-is. These are kiosks under the team's own physical control on infrastructure they own — a timing side-channel is a low-priority theoretical risk here. Revisit only if logs ever show evidence of targeted probing against a device key.

**How to apply:** don't re-raise either as an open question in future audits unless something changes the threat model (e.g. the kiosk fleet grows beyond kiosks the team physically controls).

---

## Template for new entries

```
## YYYY-MM-DD — Short decision title

**What happened / what was decided:**
**Why it matters:**
**How to apply:**
```
