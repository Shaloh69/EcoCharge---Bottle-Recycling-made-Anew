# EcoCharge — Starting Prompt for Claude Code (FULL GROUND-ZERO RESET — 2026-08-12)

Paste this into Claude Code at the repo root to resume work on EcoCharge.

---

## Why this is a reset, not a routine resume

This file went stale within the same session it kicked off — three separate times, confirmed by a cross-project documentation audit run from the sibling EngiRent project on 2026-08-12 (a subagent read all 27 non-`06` docs in this project in full and cross-checked them against each other and against `memory.md`). Read `memory.md`'s **2026-08-12** entry in full before anything else — it has the complete findings with file:line citations. Don't re-run that audit; the findings are real and already cited. Your job this session is to act on them, not rediscover them.

**The core decision made on 2026-08-12: every `[x]` in `docs/planning/08-master-checklist.md` is downgraded to unverified-until-reconfirmed.** Not because the underlying work is assumed broken — most of it is probably fine — but because trust in old checkmarks has now produced three confirmed same-day staleness incidents in this project's own docs, and this project's own stated discipline ("done" means live-verified against the deployed instance, not just present in code) has to actually be re-earned this session, not carried forward from a previous one's notes. Treat `[x]` as "claimed done, not yet re-checked" everywhere in that file until you've personally re-verified it against the real running system.

## Rule for this whole session: keep moving, don't pause to ask "should I continue?"

A prior EcoCharge session reportedly stopped repeatedly just to ask the user whether to continue, with no real decision on the table. That's a process failure, not a safety feature. **Proceed continuously through verification and fixes without narrating intent or asking permission for the next routine step.** Only stop for:
1. One of the five `[!]` items listed below (each is a genuine product/access decision, not a code question).
2. A new decision of the same shape that you find along the way and that isn't already listed.
3. Something that genuinely needs physical hardware access or an external sign-off (a key rotation, a firmware flash) that this session doesn't have.

Everything else — reading a doc, fixing a stale sentence, re-verifying a checklist item against the live system, moving a file, writing code — just do it and keep going. If your Claude Code session supports Auto Mode, turn it on; it's what let a sibling session in EngiRent run a long multi-step diagnostic without stopping for permission at every step, and this session should behave the same way.

## First action: confirm Playwright MCP is actually available in *this* session

Same caveat as every prior version of this file — it's happened twice before that the MCP was registered and healthy but a session's tool list didn't include it because the session started before registration took effect. Check directly (`ToolSearch` for `mcp__playwright__browser_navigate`, or ask a fresh subagent to report its own tool list) — don't infer from `claude mcp list`. If it's genuinely missing, say so before doing any screenshot-dependent Phase E work.

## Work order

### 1. Folder consolidation (structural fix, do this early — it's very likely the actual root cause of the recurring staleness)

Current structure has real estate scattered across three places with genuine near-duplicate content sitting side by side:
- Root: `analyzation.md`, `AUDIT.md`, `DESIGN.md`, `SELF_HOSTING.md`, plus `memory.md` and `README.md`.
- `docs/`: `CHECKLIST.md`, `PROJECT_ANALYSIS.md`, `PROJECT_PLAN.md`, `docs/design/README.md` (screenshot evidence), `docs/evidence/*.md` (thesis evidence pack).
- `docs/planning/`: the numbered `00`–`08` series (mirrors EngiRent's convention, and is the only part of this structure that's actually well-organized).

At least three pairs are near-duplicates that should not both exist:
- `docs/CHECKLIST.md` (35 lines, stale header) vs. `docs/planning/08-master-checklist.md` (157 lines, the actual current source of truth) — `docs/CHECKLIST.md` should very likely be retired outright.
- `analyzation.md` (336 lines, root) vs. `docs/PROJECT_ANALYSIS.md` (197 lines) — confusingly similar names and overlapping content; decide which is canonical and fold the other in, or clearly differentiate their purposes if they're not actually redundant.
- `DESIGN.md` (root, "as-built tracker") vs. `docs/planning/02-design-mandate.md` (the actual reference mandate — keep, matches EngiRent's `02-design-mandate.md` naming exactly) vs. `docs/design/README.md` (screenshot evidence index, never cross-linked from `DESIGN.md`). Decide whether `DESIGN.md` still earns its own file given `08-master-checklist.md`'s Phase E is now the more current account of the same status.

**Target shape**: everything that is a planning/status/reference document moves under `docs/planning/` with sequential numbering, matching EngiRent. `memory.md` and a short pointer-only `README.md` stay at root (this matches EngiRent's own convention too). `docs/evidence/` stays as its own folder — that's thesis evidence, not planning, and doesn't need to be in the numbered series. For each root/`docs/`-level file: either move it into `docs/planning/` with a real number, merge it into whichever doc already supersedes it, or explicitly retire it with a one-line note in `memory.md` explaining the decision (the same way `04-continue-design-redo.md`'s retirement was recorded). Don't leave a root copy and a `docs/planning/` copy of the same information coexisting — that duplication is what let three separate docs go stale independently while a more current doc sat right next to them uncorrected.

Update every cross-reference after moving files — grep for the old filenames across the whole `docs/` tree and `memory.md` before considering this done.

### 2. Fix the specific stale claims the audit already found (don't re-derive these, just fix them)

- `analyzation.md` §8 — avatar upload description still says Supabase Storage; it's local-disk (`MEDIA_STORAGE_PATH`) + `express.static` now.
- `docs/PROJECT_ANALYSIS.md` — two table rows (Software Stack; Paper-To-Repository Gap Analysis) still describe MySQL as Aiven-hosted; self-hosting is done.
- `docs/PROJECT_PLAN.md` line ~106 — still lists self-hosting migration as an unstarted milestone with no strikethrough, even though the file's own banner says it's done.
- `docs/CHECKLIST.md` — header says "Refreshed 2026-08-10" but body has 2026-08-11-dated content; likely moot once folder consolidation retires this file.
- `README.md` — still points at Phase E4 as open; it's done (Website deployed, screenshot-verified).
- `DESIGN.md` — "execution status" section says the dense-table pass and the §4.6 component catalog are still the biggest gaps; `08-master-checklist.md` shows both done.

**Re-verify each of these against the live system before marking it fixed** — don't just trust `08-master-checklist.md`'s account either, per the ground-zero rule above. If a "done" claim doesn't actually hold up when you check the real deployed instance, that's a real finding, not a doc-formatting nitpick — log it in `memory.md` the same way this project logs every other real incident.

### 3. Re-verify `08-master-checklist.md`, phase by phase, against the live system

Go through every `[x]` item and actually check it against the real deployed API/AI server/admin console/kiosk web/website/mobile app — not against what the checklist or `memory.md` claims. Where it holds up, you can leave it `[x]` with a fresh dated confirmation note. Where it doesn't, fix the code or the doc, whichever is wrong, and record what actually happened. This is real work, not a formality — the whole point of the reset is that "done" needs to mean something again.

### 4. Build the EngiRent-style "Update Required" hard-block gate for the Flutter mobile app

Confirmed absent by the audit. What already exists: a real `/update-required` page on the public Website with real release highlights (`memory.md`, 2026-08-11). What's missing: the Flutter app itself never checks its own version or redirects there. Build the actual in-app gate — on launch, compare the installed version against a server-reported latest/minimum version (mirror EngiRent's `LATEST_APP_VERSION`/`MIN_APP_VERSION` pattern and its `/app-config` endpoint shape if useful as a reference, don't copy verbatim), and route to a hard-block screen when out of date. Decide explicitly whether it's dismissible or a hard block — that's a real product decision, make the call and record it, don't default to guessing. Note: EcoCharge has no real feedback/bug-report pipeline yet (confirmed absent), so there's no real data to credit a bug-finder with the way EngiRent's version does — don't fabricate names; either omit that part of the pattern or note it as a future addition once a feedback pipeline exists.

### 5. The five open `[!]` decisions — stop and ask for each, don't guess

1. Key rotation (device API key + AI API key) sign-off — `08-master-checklist.md` line ~37.
2. The `ml-review` gate question (hold credits pending human review, or keep the current retrospective audit-trail behavior) — line ~48. Note: this is structurally the same failure class as EngiRent's "verification flag not enforced at the write path" bug — useful framing when presenting the decision, not a reason to guess at the answer.
3. Mobile App home/credit-balance-card screenshot verification needs real login credentials — line ~103.
4. AI server's 0.40 confidence floor vs. kiosk's 0.5 accept floor — reconcile deliberately, line ~121.
5. Confirm the YOLO26 thesis-narrative update landed in the actual thesis paper document — it's not in this repo, can't be checked from here — line ~145.

Also worth surfacing even though it's currently marked `[~]` rather than `[!]` in the checklist: the two paused firmware fixes still need physical hardware access and your sign-off on the values before they can be flashed (`08-master-checklist.md` Phase C). The audit found this buried in prose rather than flagged the same way as the five above — treat it as a sixth real stop-and-ask item.

### 6. Other real gaps the audit found, worth fixing along the way

- **Rate-limiter re-verification behind the new Cloudflare topology**: the guest-endpoint rate limiter's `trust proxy` fix was verified before the migration off Render onto `cloudflared tunnel --url`; the later login-rate-limit fix was only verified from a single external client. Confirm two genuinely different external IPs get separate buckets on the current topology — this is exactly the class of gotcha the EngiRent session hit for real (shared rate-limit buckets between real users and test traffic behind a proxy).
- **`README.md`'s suggested reading order omits `08-master-checklist.md` and `06-must-have-app-features.md`** — the two most load-bearing docs in the project. Fix the reading order once the folder consolidation above settles where things live.
- **`docs/design/README.md` (the real screenshot evidence) is never cross-linked from `DESIGN.md`** — fix as part of the design-doc consolidation.

### 7. Design mandate — a second correction pass landed 2026-08-12, verify it's actually followed once Phase E design work resumes

`02-design-mandate.md` got a direct, real cross-check against EngiRent's own mandate this same day (not a re-audit of EcoCharge alone) — the 2026-08-11 correction that tried to make the Admin Console's structural references "independent" of EngiRent had actually just pointed at the same upstream templates EngiRent itself cites (three-for-three overlap: two Mantine dashboard repos plus TailAdmin). That's fixed now — real IoT/telemetry-genre references (a Signal-style ops-monitoring pattern, ThingsBoard's device-fleet IA) replace them. Also fixed: a leftover Website line still pointing at Velora UI's page set after an earlier correction had already moved away from it, and a locked, explicit light+dark dual-palette table for the Admin Console and Mobile/Website (previously only the Admin Console's dark ramp had real values; light mode was unspecified). **Follow these to the letter once any Phase E work touches the Admin Console, Website, or a light/dark toggle** — don't re-derive dark-mode colors by inverting light-mode ones, use the new lifted dark-mode primary (`#34D399`), and don't reach for the two Mantine templates or TailAdmin this correction just removed.

**A second pass the same day also**: locked real template references for the Mobile App (Loyalify, Wallet App UI Kit, Rewards and Discounts App UI Kit — it had none before, unlike every other surface), added the Mobile App's missing animated background (`flutter_floating_particles`'s `ParticleConfig.fallingLeaves`, completing the leaf motif across Kiosk/Website/Mobile), and **moved the screenshot folder from `docs/design/screenshots/` to `docs/design-screenshots/` to match EngiRent's own convention exactly** — flat, surface-prefixed filenames, a `reference/` and a `deployed/` subfolder. Save any new Phase E screenshots there, in that naming style, going forward. Full reasoning in `memory.md`'s two most recent 2026-08-12 entries.

## Settled decisions — don't re-litigate

- Guest pooled balance (kept, rate-limited) and device-key timing (accepted as-is) — both closed.
- Free Cloudflare quick tunnels for API/AI/Admin console — chosen, including the URL-rotation risk for firmware/app defaults.
- Dataset merge for AI training — dropped per instruction, not pursued.
- Mascot art — Genshin-Impact-inspired deck art authorized "for show only" with a required inspired-by credit wherever it appears. Settled; the attribution requirement is real and still needs to land wherever a mascot screen ships.
- `docs/planning/06-must-have-app-features.md` — already audited and current (2026-08-10 appendix), cross-checked directly this reset and confirmed still accurate. No action needed there; don't re-audit it.

## Work rhythm

Update `memory.md` continuously — a dated entry the moment something real is found or decided, not a batch at the end. Commit as you go; ask before pushing. Give one consolidated summary at the end of the session, but don't wait until the end to record findings.
