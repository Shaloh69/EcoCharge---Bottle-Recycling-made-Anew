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

## 2026-08-10 — Mascot decision overridden by the user; HeroUI dropped entirely; AI training location clarified

**Mascot — the user explicitly overrode the copyright caution flagged earlier the same day.** Told directly: the mascot is "for show only," keep using the Genshin-Impact-inspired art, just add an "inspired by the Genshin Impact team" credit in the docs. The user is explicit about being a fan of the franchise. **This is a final, settled decision — don't re-raise the copyright concern.** The one actual follow-through obligation: credit it as inspired-by wherever it's documented (`DESIGN.md`, thesis material), not passed off as fully original. `02-design-mandate.md` §4.6/intro updated accordingly.

**Component library — full reversal, real scope change.** The user wants HeroUI deleted entirely from both `client/kiosk_web` and `client/web_console` — a genuine delete-and-redo, not a re-theme. Earlier guidance in `02-design-mandate.md` (keep `hero.ts` as a bridge) is superseded. Chosen replacements, with reasoning (`02-design-mandate.md` intro + §7): **Mantine** for the Admin Console (dense ops-dashboard fit, already proven on a comparable sibling-project surface), **shadcn/ui on Radix UI or Base UI primitives** for Kiosk Web (the real Figma reference's bespoke pill/wave-divider aesthetic needs unstyled primitives, not another opinionated component library — and this now shares a primitive layer with the new Website surface, which is already shadcn/ui-based via Velora UI). Also corrected a real mistake found while reconciling this: an earlier pass in the design mandate said to delete `--color-eco-dusk`/`--color-eco-lavender` (purple tokens) as banned-pattern violations — wrong, §4.6's real design reference confirms purple is a deliberate accent. Don't delete those.

**AI training location — reversed again, this time by explicit user instruction, overriding the hardware-based recommendation.** Checked both real candidates: `desktop-gklhcri` has only an AMD Radeon GPU (no CUDA, `nvidia-smi` absent) — training there is CPU-only (or DirectML at best), "several hours" per `SELF_HOSTING.md`'s own CPU estimate. The dev machine (`minniedumpor`) has the CUDA-capable RTX 3050 that guide was written against (~15–30 min runs). Claude's first recommendation was to train on `minniedumpor` for that reason. **The user explicitly overrode this: train on `desktop-gklhcri`, not the laptop.** Don't re-litigate — this is a settled instruction, not a technical question with one right answer; the user has reasons (laptop availability/mobility, `desktop-gklhcri` being the always-on machine) that outweigh the raw speed difference. Set expectations accordingly (this will be slow, likely hours, and worth running as a background/detached job rather than a foreground wait) but proceed on that machine.

**Dataset presence, resolved 2026-08-10:** the local dev-machine checkout of `scripts/dataset/Eco-Charge.v1` has no actual images (only 8 non-image files — configs, `README.dataset.txt`, stale `labels.cache` files; everything under `scripts/dataset/**` is gitignored). **`desktop-gklhcri`'s clone has the real thing** — 1567 files under the same path. Train there using that machine's own copy of the dataset, don't try to sync images from the laptop first.

**Dataset merge — abandoned by user instruction, not pursued further.** Asked to merge the `magical-nightingale` dataset into training; no Ultralytics HUB credentials were found on either machine to pull it. **User said to ignore it** — proceed with the existing `Eco-Charge.v1` set instead, rely on YOLO's built-in augmentation (already tuned in `train_yolo.py`: hsv/degrees/translate/scale/fliplr/mosaic/mixup) rather than sourcing/merging another dataset. Don't re-raise the HUB-credentials blocker as a to-do — it's a dropped path, not an open item.

**AI training — actually kicked off and confirmed running, 2026-08-10.** Real findings and real execution, not just planning:
- **Training runs on `desktop-gklhcri`** per the user's explicit override (not `minniedumpor`, despite the GPU being there — see above).
- **`desktop-gklhcri`'s dataset copy (`D:\EcoCharge\EcoCharge\scripts\dataset\Eco-Charge.v1`) had grown to 546 train images** (vs. the ~103 documented back in March) but **`valid/images` was completely empty** — would have broken validation during training. Fixed with a new reusable utility, `scripts/split_validation.py` (moves a random 15% of train pairs into valid, warns about any image with no matching label rather than moving it silently). Result: 465 train / 81 valid / 79 test, all pairs matched.
- **Added `--freeze` to `scripts/train_yolo.py`** (freezes the first N backbone layers when fine-tuning — real, current Ultralytics guidance for cutting CPU training time) and made `amp` explicitly `False` on CPU runs (it's a GPU-only optimization, was previously unconditional).
- **Launching a detached process via `Start-Process` over SSH does not survive the SSH session on this machine** — a real, generalizable finding, not specific to this one run: Windows OpenSSH appears to tear down child processes tied to the session's job object when the session ends, even with `Start-Process`. **The working pattern: write a `.bat` launcher, register it as a Windows Scheduled Task (`schtasks /Create ... /SC ONCE`), then fire it immediately with `schtasks /Run /TN <name>`** — a scheduled task's process isn't tied to the SSH session's job object at all. Use this pattern for any future long-running detached job on `desktop-gklhcri` (or `minniedumpor`), don't retry plain `Start-Process` and expect it to outlive the SSH connection.
- **Confirmed actually training**, not just launched: real per-batch loss values decreasing, epoch 1/80, ~465 train images / batch 16 ≈ 29 batches/epoch, ~4-7s/iteration on CPU. This is a multi-hour job (rough order of magnitude: hours, not minutes) — left running via the scheduled task. Logs: `D:\EcoCharge\EcoCharge\runs\logs\train_stdout.log` / `train_stderr.log` on `desktop-gklhcri`. Check with `schtasks /Query /TN EcoChargeTrain /FO LIST /V` (shows `Status: Running` while active) or by tailing the log.

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

## 2026-08-10/11 — Training stalled under resource contention with the Supabase pull; recovered via resume

Real operational incident, not just a note: the YOLO training run (launched via Task Scheduler, `--workers 6`) genuinely stalled at epoch 32, batch 13/30 — confirmed stuck (not just slow) across multiple checks minutes apart, despite the process still accumulating CPU time (a red herring — CPU activity alone doesn't prove forward progress; this looked like a classic Windows/PyTorch `DataLoader` multiprocessing-worker deadlock, a known category of issue, not corruption or a crash).

**Timeline:** the self-hosted Supabase stack (a much larger pull — 10+ images) was being brought up on the same machine concurrently. The stall coincided with that pull. Stopping the Supabase containers (`docker compose stop`) did **not** immediately unstick training, confirming the deadlock had already occurred rather than being an ongoing contention effect that would self-resolve.

**Fix:** killed the stuck process, resumed from the real checkpoint YOLO had already saved (`weights/last.pt`, epoch ~31 — `save_period=10` checkpointing meant nothing was lost) via `--resume` with `--workers 2`. **Real finding worth keeping**: on resume with `device=cpu`, Ultralytics automatically forced `workers=0` (single-process data loading) regardless of the `--workers 2` passed — likely a deliberate safety behavior for CPU training. This is slower per-batch but immune to the exact multiprocessing deadlock class that caused the stall, so left as-is rather than fought.

**How to apply:** if training on `desktop-gklhcri` stalls again (progress log unchanged across several checks despite the process still showing CPU time), don't assume it'll self-resolve — check for a recent checkpoint (`runs/detect/*/weights/last.pt`) and resume rather than waiting indefinitely or restarting from scratch. If launching a new CPU training run from scratch (not resuming), consider starting with a low worker count (or `--device cpu` and letting Ultralytics auto-manage workers) rather than defaulting to a high worker count copied from a GPU-oriented example. Also: **don't run a large multi-image Docker pull (like the Supabase stack) concurrently with an active training run on this machine** if avoidable — sequence them instead, even though they're logically independent tasks.

**Second, separate incident the same session: self-hosted Supabase's `auth`/`pooler`/`realtime` services crash-looped** with `password authentication failed for user "supabase_auth_admin"`. Root cause: the `db` container's Postgres data volume (`docker/volumes/db/data`) got initialized once — baking in whatever `POSTGRES_PASSWORD` was live at that exact moment — before secret generation had fully landed, so the password Postgres actually stored didn't match what `.env` said afterward. Postgres only applies `POSTGRES_PASSWORD` on a truly empty data directory; restarting the container never retroactively fixes a mismatch. **Fix: `docker compose down`, delete `docker/volumes/db/data`, bring the stack back up for a genuinely fresh init** — safe to do since nothing real had been stored in this brand-new instance yet. If this happens again on a self-hosted Supabase/Postgres stack, this is the general fix, not something specific to this one incident — a credential change after first boot never applies retroactively, wipe and reinit instead of debugging the running container.

**Resolved and confirmed 2026-08-11: all 10 services genuinely healthy** (`db`, `kong`, `studio`, `imgproxy`, `edge-functions`, `auth`, `meta`, `pooler`, `rest`, `storage`, `realtime`). One more wrinkle on the way there, worth keeping: several services were stuck in Docker's `Created` state (defined but never actually started) rather than crash-looping — `docker compose ps` alone won't show these (it only lists running containers by default; use `ps -a`), and a second `docker compose up -d` was needed to actually start them. `auth`'s logs confirmed real migrations running with no password error this time, proving the wipe-and-reinit fix genuinely worked, not just stopped erroring by coincidence.

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
