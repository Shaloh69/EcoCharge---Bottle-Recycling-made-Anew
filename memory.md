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

## 2026-08-10 — Self-hosting migration unblocked: SSH access works, real recon done on `desktop-gklhcri`

**SSH access — the actual working credential, don't re-guess this:** `ssh transfer@desktop-gklhcri`, not `Shaloh@...` (the local Windows account name). The `transfer` account is the one with this machine's key authorized. Verified working 2026-08-10.

**Real state found on `desktop-gklhcri`, checked directly — don't assume `03-revamp-master.md` §1's prerequisites are unmet without checking first:**
- **Docker is already installed** (29.6.2), with WSL2 + Ubuntu already set up as the backend. The "install Docker Desktop" prerequisite in `03-revamp-master.md` §1 is already satisfied — don't redo it.
- **Disk space confirms the Disk D decision was right**: C: has only ~17GB free (220GB used) — genuinely tight. D: has ~648GB free. E: also exists (~89GB free, ~843GB used) but wasn't part of the plan; stick with D: per the existing decision.
- **`D:\EcoCharge\` already exists**, with two things in it pre-dating this session's docs work:
  - `D:\EcoCharge\EcoCharge\` — a full clone of this repo, same GitHub remote. Was stale (last synced commit `4e74fa4`, 2026-04-23) — **pulled and fast-forwarded to `c8d4a8a` this session**, now current.
  - `D:\EcoCharge\datasets\magical-nightingale\` — **a second, separate bottle-detection dataset**, hosted on Ultralytics Platform (`platform.ultralytics.com/jobert-vidad/datasets/magical-nightingale`), created 2026-04-20 by a collaborator (`jobert-vidad` — a teammate not otherwise referenced in any doc so far). Single class `plastic bottle` (same taxonomy as the existing `Eco-Charge.v1` set), ~78MB per its own `data.yaml`, real train/val/test split already defined. **The images themselves aren't downloaded locally yet** (0 files under `images/` at recon time) — it's a registered dataset reference, not yet pulled/merged. This is directly relevant to `docs/planning/07-ai-detection-improvements.md` §4 (dataset expansion) — check with the team/this collaborator before hunting external Roboflow sets from scratch; there may already be a plan for this dataset that isn't written down anywhere yet.

**How to apply:** when resuming the self-hosting migration, start from `03-revamp-master.md` §1.0 (folder layout — `D:\EcoCharge\mysql\`, `D:\EcoCharge\supabase\` etc. as siblings to the existing `EcoCharge\` and `datasets\` folders, not nested inside either). Docker Compose files and standing up the MySQL/Supabase containers is the next real step, not yet done as of this entry. Ask about `magical-nightingale` before doing more dataset research — a teammate may already own this.

---

## 2026-08-10 — Kiosk premade designs reviewed; real mascot copyright problem found

`EcoCharge.pdf` (80 pages, a Figma export at true kiosk resolution — 1080×1920) was dropped at the repo root and reviewed in full. Findings folded into `02-design-mandate.md` §4.6 — real palette (including a genuine, repeated purple tertiary accent this document didn't previously have), real typography (a rounded/friendly display face, not the previously-speculated Outfit), a signature wave/blob divider shape, and a real component catalog (bin-level battery gauge, station-picker grid, on-screen numeric keypad, OTP entry, success/fail halo badge, receipt screen).

**Real problem found, not previously known:** several mascot/avatar images in the deck are fan art of an existing copyrighted character — one carries an explicit **"© Genshin Impact"** credit visible in the file, and at least two others are stylistically consistent with the same source (miHoYo/HoYoverse). **This cannot ship in any public-facing context** (public GitHub repo, live kiosk, thesis defense) without real licensing, which almost certainly isn't obtainable for a student project. Not a nitpick — a real legal/practical exposure if shipped as-is.

**Decision, not yet made by the user — flagged, not resolved:** the recommended path (stated in the mandate) is to treat the deck's mascot art as *mood/style reference only* (chibi nature-spirit, flower crown, green palette, holding a bottle) and commission or generate an original character in that spirit rather than the traced art itself. **Don't build or ship any mascot-bearing screen using the deck's actual character images until this is explicitly resolved with the user.**

**Also found, real and new:** a language-switcher control ("Eng ⌄") in the deck — multi-language support is in scope, but which languages beyond English isn't decided (Bisaya/Cebuano is the obvious local candidate given the UC Lapu-Lapu/Mandaue deployment, but ask, don't assume).

**How to apply:** the Figma-designs blocker from the earlier 2026-08-10 entry is resolved — don't re-ask for it. The mascot blocker has shifted shape: it's no longer "no art exists," it's "the existing art can't be used as-is." Don't silently proceed with the traced character on any screen.

---

## 2026-08-10 — Fourth client surface added (public website), Kiosk design clarifications, Tailscale on the kiosk PC

**Four separate additions from the same message, recorded together since they landed at once:**

1. **New surface: `client/web`, a public promotional website** — doesn't exist in the repo yet. Modeled explicitly on a sibling project's equivalent surface: home, real dated changelog, public docs (distinct audience from `docs/planning/`), and an app-download page (direct APK download, since there's no evidence this app is published to any app store — don't build toward an assumed store listing). Template: Velora UI (`github.com/ColorlibHQ/velora-ui`), re-themed to the green/white identity. Full spec: `02-design-mandate.md` §6.
2. **Kiosk PC needs Tailscale added** — confirmed not set up yet. This is for remote admin access only (SSH, deploys, log checks) — it does **not** change the kiosk's public Cloudflare Tunnel runtime path, which stays exactly as already planned in `03-revamp-master.md` §1.1/§1.2. Two separate connections, two separate purposes.
3. **Kiosk palette restated explicitly: Green + White is the base identity**, not just one option among the existing token table — with room for supporting accents (amber for charging, red for errors) but the product should read as green-on-white at a glance. Not a new decision, a clarified restatement of the existing "Clean Energy Reward" direction.
4. **Animated background is mandatory on the Kiosk idle screen** — real candidate components found and listed in `02-design-mandate.md` §4.5 (react-bits Aurora, shadcn.io Aurora, Aceternity UI Aurora, a standalone gradient-animation library), all to be re-themed to eco-green.

**Two genuinely open blockers, not resolved yet — don't guess at either:**
- **The user has premade Figma designs for the Kiosk** that should take priority over any generic template reference once shared — not yet linked in any document. Ask for the file/link before doing final visual work on the Kiosk.
- **The product has its own mascot/character** — confirmed to exist, no visual design provided yet. Don't invent a placeholder character; leave the slot specified (idle screen, bin-full/reject screens, success moment — per `02-design-mandate.md` §4.5) but visually unfilled until real art exists.

**How to apply:** don't start final (non-structural) visual work on the Kiosk until both blockers are resolved. The Public Website, Admin Console, and Mobile App aren't blocked by either and can proceed independently.

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
