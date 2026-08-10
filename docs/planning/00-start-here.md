# EcoCharge — Starting Prompt for Claude Code

Paste this into Claude Code at the repo root to resume work on EcoCharge.

---

**First action, before anything else: confirm Playwright MCP is actually available in *this* session.** It's registered and healthy at the CLI level (`claude mcp get playwright` → `✓ Connected`), but MCP tool lists load once at session startup — a session that started before the registration took effect won't see the tools even though the registration is fine. This has happened twice already (`memory.md`, 2026-08-11 entries). Check directly — search this session's own tool list for anything Playwright/browser-automation-related (e.g. via `ToolSearch`, or by asking a fresh subagent to report its own tool list) — don't infer availability from `claude mcp list` output, and don't assume it's available just because it worked in a session on a different project. If it's genuinely missing here too, stop and tell the user before doing any Phase E screenshot-dependent work — that's a deeper problem than startup timing and needs new diagnosis, not another restart-and-hope.

Read `docs/planning/08-master-checklist.md` next, in full — it's the current, real source of truth for exact status. It consolidates every actionable item from `00-07` with honest, re-checked status — `[x]` done and verified, `[~]` code-complete but not fully verified, `[ ]` not started, `[!]` blocked on a decision only you can make. **Consult it before assuming anything below is done or not done.**

Then read `memory.md` at the repo root (reverse-chronological, newest first) for the full reasoning behind the decisions below.

**Real current state, as of 2026-08-11 (later same day) — a prior session this same day was deliberately stopped mid-task specifically to get a fresh session where Playwright loads correctly; nothing below was left broken, only the documentation audit was left unstarted:**

- **Self-hosting migration is done.** Aiven and Supabase both fully scrapped. Docker MySQL (`desktop-gklhcri`, port 13306) is the live system of record. Media on local disk (`D:\EcoCharge\media`). Node API, admin console, and AI server all deployed as persistent services (ports 30010/30011/30012, Task Scheduler `ONSTART` + crash-restart `.bat` pattern).
- **All three of API, AI server, and admin console are now on public Cloudflare quick tunnels** — this reverses the earlier "admin console stays Tailscale-only" decision; the user was asked explicitly this session and chose to make it public. Current URLs (will rotate on restart — check `D:\EcoCharge\logs\cloudflared\*.log` on `desktop-gklhcri` for the live one, don't trust anything written down here):
  - API: `https://lap-trace-reach-forwarding.trycloudflare.com`
  - AI server: `https://recipient-beliefs-landscapes-established.trycloudflare.com`
  - Admin console: `https://alert-identical-enclosed-heath.trycloudflare.com`
  - All three verified reachable from the public internet via real `curl` this session, not just Tailscale.
- **Kiosk Web and the public Website are still not deployed anywhere** — Kiosk Web has real code progress (HeroUI→shadcn foundation, mascot on idle screen) but no field PC is reachable; the Website doesn't exist as a built site yet beyond scaffolding. Free ports on `desktop-gklhcri` for when either gets deployed there (even as a staging deployment, pending real field hardware): continue EcoCharge's `3001x` numbering — `30013`, `30014`, etc. **Verify with `Get-NetTCPConnection` on the actual machine before binding**, don't assume the port table in `memory.md`/this file is exhaustive — confirmed this session that `desktop-gklhcri` also runs sibling-project (EngiRent) services not previously catalogued (ports 3012, 8001, among others).
- **Real security gap found and fixed this session**: `POST /api/auth/login` had no rate limiting before now — fixed (10 attempts/15min/IP) before the admin console went public, verified live.
- **Real doc-vs-reality drift found this session, worth internalizing as an ongoing risk, not a one-time fix**: `memory.md` had claimed a deployed-server fix (`tsconfig.json` excluding test files from the build) was "verified," but that was only true of the local repo checkout — the actual deployed copy on `desktop-gklhcri` never got it. **Treat any "verified" claim in this file about a deployed service with real suspicion until you've checked the actual deployed file/instance yourself** — this is the same class of gap the master checklist itself exists to guard against, and it just recurred in a new form.
- **The AI detector finished training with real, strong results** (mAP50 0.9950, mAP50-95 0.9447, Precision 0.9988, Recall 1.0000) and is what the deployed AI server actually runs. The classifier was not retrained — original weights, deliberately untouched.
- **The documentation audit has not actually started** — a prior session this same day began reading through `docs/planning/00-09`, `DESIGN.md`, `AUDIT.md`, `analyzation.md`, `docs/CHECKLIST.md`, `docs/PROJECT_PLAN.md`, `docs/PROJECT_ANALYSIS.md`, and the root `README.md` (also worth checking: the root `SELF_HOSTING.md`, dated April, almost certainly stale against the real Docker-based self-hosting that actually happened) but made zero corrections yet. This is real, required work, not optional — see "Work order" below.
- **Design revamp (Phase E) has not been touched this session** — still blocked on Playwright actually being available, per the check at the top of this file.

**Settled decisions — don't re-litigate:**
- Guest pooled balance (kept, rate-limited) and device-key timing (accepted as-is) — both closed.
- Free Cloudflare quick tunnel for API/AI/Admin console, including the rotation risk for firmware/app defaults — explicitly chosen, and now extended to the admin console too (see above — this reverses the earlier Tailscale-only decision, don't revert it back without asking again).
- Dataset merge for AI training — dropped per instruction, not pursued.
- Mascot art — user explicitly authorized continuing to use the Genshin-Impact-inspired deck art "for show only," with a required inspired-by credit wherever it appears in docs/thesis material. **This is settled — don't re-raise the copyright concern as a blocker**, but the attribution requirement is real and still needs to actually land wherever a mascot screen ships.

**Open items only you can resolve — stop and ask, don't guess:**
1. **Key rotation** (device API key + AI API key) — code can be built ahead of this, but rotating the actual keys needs your go-ahead.
2. **The two firmware fixes** (`BOTTLE_SCAN_TIMEOUT_MS=60000`, `BOTTLE_BIN_RECHECK_MS=4000`) — implemented in source, safe to write since hardware is unreachable, but the actual flash needs your sign-off on the values *and* physical access — neither available right now.
3. **The `ml-review` gate question** — should a low-confidence AI detection hold credits pending human review, or is the current retrospective audit-trail behavior the actual intended design? Genuine product decision.
4. **AI confidence floor mismatch** — the AI server's 0.40 floor vs. the kiosk's 0.5 accept floor. Reconcile deliberately, don't guess which is "right."

## Work order

Continuous sweep, don't stop for review between unblocked items. **Do** stop at every `[!]` in `08-master-checklist.md`, and at any other genuine product decision or hardware-access need you find along the way.

1. **Confirm Playwright MCP works in this session** (see top of this file) before any design work.
2. **Finish the documentation audit** — go through every doc listed above, check each claim against the real, current state of the code and the live deployed instance (not against what an earlier doc says), and correct/rename/renumber/merge/retire anything stale, redundant, or contradicted by a later decision. This runs alongside the technical work below, informing it, not as a separate pass done first or last.
3. **Cloudflare tunnel consistency, remainder**: API/AI/Admin console are done. Once Kiosk Web and/or the Website actually get built enough to deploy, put them on quick tunnels too and verify public reachability the same way (real external `curl`, not just a local check).
4. **Phase E — design revamp**, once Playwright is confirmed working: Admin Console first (dense-table pass, the still-unfixed glassmorphism/banned gradients — login page worst, never touched by the earlier Mantine rebuild — screenshot-verified in both color schemes), then Kiosk Web (component catalog against the real Figma deck `§4.6` of `02-design-mandate.md` — wave/blob divider, kiosk bin gauge, station-picker grid, keypad, OTP sheet, halo badge; **flag the mascot copyright issue explicitly before building any mascot-bearing screen**, even though the "keep the art" decision is settled — the attribution obligation is not), then Mobile App (screen-by-screen animation pass; if the Flutter SDK isn't available in this environment, say so explicitly and describe what needs manual verification), then the Website (Velora UI structure, adapt don't copy).
5. **App-distribution pages** on the public Website: real fetch-progress download page, a real dated changelog sourced from `memory.md`'s actual entries, and an "update required" hard-block screen with real release highlights. Check first whether a real, buildable mobile app release exists yet — if not, build the pages/infrastructure now (changelog can start populating from real `memory.md` history immediately) and wire the download flow to a real APK the first time one actually gets cut.
6. Anything else `08-master-checklist.md` still lists as `[ ]` or `[~]`, worked in the order it lists them.

Update `memory.md` and `08-master-checklist.md` continuously as real work lands — a dated entry the moment something is found or decided, not a summary at the end. Commit as you go; ask before pushing.

Give one consolidated summary at the end.
