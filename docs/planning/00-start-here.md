# EcoCharge — Starting Prompt for Claude Code

Paste this into Claude Code at the repo root to resume work on EcoCharge.

---

Read `docs/planning/08-master-checklist.md` first, in full — it's the current, real source of truth for exact status (built 2026-08-11 after a self-audit found `DESIGN.md` had items marked done without the screenshot verification `02-design-mandate.md` §0 requires). It consolidates every actionable item from `00-07` with honest, re-checked status — `[x]` done and verified, `[~]` code-complete but not fully verified, `[ ]` not started, `[!]` blocked on a decision only you can make. **Consult it before assuming anything below is done or not done — don't trust a summary, including this one, over that file.**

Then read `memory.md` at the repo root (short, reverse-chronological — newest entries at the top) for the full reasoning behind the decisions below, several of which reversed earlier plans.

**Real current state, as of 2026-08-11 — stated plainly because an earlier version of this file said the opposite:**

The self-hosting migration is **done**, not "not started." It also **doesn't look like the original plan** — read `memory.md`'s 2026-08-11 entries before touching infrastructure, not just this summary:
- **Aiven and Supabase are both fully scrapped** — not self-hosted, not migrated, abandoned outright on your explicit instruction ("scrap and dump the whole aiven and supabase," "you dont need to access aiven or supabase"). This reverses the 2026-08-10 plan to self-host Supabase via Docker — that stack was actually built, verified healthy, then torn down the next day on this instruction.
- **Docker MySQL is the live system of record** (`desktop-gklhcri`, port 13306, fresh schema via `prisma db push` — this repo's migrations have no baseline, `migrate deploy` fails on an empty DB, don't use it here).
- **Media/avatars live on local disk** (`D:\EcoCharge\media`, served via `express.static`), not Supabase Storage.
- **Node API, admin console, and the AI server are all deployed as persistent services** on `desktop-gklhcri` (ports 30010/30011/30012, Task Scheduler `ONSTART` + crash-restart `.bat` pattern — NSSM/PM2 are both absent from that machine). All verified live, not just "should work."
- **Public access is a free Cloudflare quick tunnel**, chosen explicitly over a named tunnel after being told the real tradeoff (quick tunnel = free but the hostname rotates on every restart; a stable hostname needs a domain added as a Cloudflare zone). **The current tunnel URL will be stale by the time you read this** — check `D:\EcoCharge\logs\cloudflared\*.log` on `desktop-gklhcri` for the live one, or ask the user, rather than trusting any URL written down in a doc.
- **You explicitly accepted the rotating-URL risk for the ESP32 firmware and the Flutter app's default API URL** — both have the tunnel hostname baked into source (`esp/ecocharge/include/config.h`, `client/flutter_app/lib/services/api_service.dart`). **Neither has been flashed/rebuilt against real hardware** — the ESP32 and the kiosk are both physically unreachable right now, confirmed by you ("all hardware is not accessable... skip that for now"). Don't re-ask where the hardware is; you've said it's just unavailable for now.
- **The AI detector finished training with real, strong results** (mAP50 0.9950, mAP50-95 0.9447, Precision 0.9988, Recall 1.0000) and is what the deployed AI server actually runs. **The classifier was not retrained** — still the original weights, deliberately untouched, don't retrain it without being asked.
- **A first real design-review pass ran against the live admin console** (forensic method — real `curl`-fetched HTML/CSS/API responses cross-referenced against source, since Playwright MCP still isn't installed) and found three genuinely live functional bugs, all fixed: the offline-kiosk alert banner had never fired once in its life (severity-vocabulary mismatch between the API and the frontend), a missing timestamp field silently rendered "Invalid Date," and the kiosk list hardcoded a zero bin-level instead of reading the real value. **The systemic design problems it also found — glassmorphism and banned decorative gradients on every route, including three separate ones on the login page that the Mantine rebuild never touched — were deliberately left unfixed.** That needs the real screenshot-verification loop, which needs Playwright MCP installed first; don't patch it at the source level in the meantime.

**Settled decisions — don't re-litigate:**
- Guest pooled balance (kept, rate-limited) and device-key timing (accepted as-is) — both closed.
- Free Cloudflare quick tunnel, including the rotation risk for firmware/app defaults — explicitly chosen after being told the tradeoff.
- Admin console stays Tailscale-only, not tunneled — deliberate, can be reversed if you actually want it public.
- Dataset merge for AI training — dropped per your instruction, not pursued.

**Open items only you can resolve — stop and ask, don't guess:**
1. **Key rotation** (device API key + AI API key) — the NVS/provisioning-portal code change can be built ahead of this, but rotating the actual keys needs your go-ahead.
2. **The two firmware fixes** (`BOTTLE_SCAN_TIMEOUT_MS=60000`, `BOTTLE_BIN_RECHECK_MS=4000`) — implemented in source, safe to write since hardware is unreachable (nothing to accidentally flash), but the actual flash needs your sign-off on the values *and* physical access to the device — neither available right now.
3. **The `ml-review` gate question** — should a low-confidence AI detection hold credits pending human review, or is the current retrospective audit-trail behavior (credits awarded immediately, admin spot-checks after) the actual intended design? Genuine product decision, not inferable from code.
4. **AI confidence floor mismatch** — the AI server's 0.40 floor vs. the kiosk's 0.5 accept floor. Reconcile deliberately, don't guess which is "right."

## Work order

Per `08-master-checklist.md`'s own phases — work continuously through what's unblocked, don't stop for review between items, but **do** stop at every `[!]`:

1. **Playwright MCP install** — blocking the real screenshot-verification loop for all of Phase E (design). Get this working before another design-review pass; the forensic curl-based method got surprisingly far but explicitly can't check animation, hover/focus states, or real rendered contrast.
2. **Phase E — design revamp**, once Playwright MCP works: the glassmorphism/banned-gradient removal across the admin console (all routes, login page worst), the kiosk web component catalog (the largest concrete gap — wave/blob divider, kiosk-styled bin gauge, station-picker grid, numeric keypad, OTP bottom-sheet, success/fail halo), the mobile app's screen-by-screen animation pass (blocked on the Flutter SDK not being available in this environment — needs either that installed here or manual verification by the user), and screenshot-verifying the public website.
3. **Phase G — testing**: backend (`vitest`, 11 tests) and AI server (`pytest`, 7 tests) are both done from scratch. End-to-end/integration scripts covering the happy path and the five fault paths are not — real gap. Hardware validation needs physical access that doesn't exist right now.
4. **Phase H — thesis evidence pack**: architecture diagram and ML evaluation report are both done with real numbers. UI screenshots are blocked on Phase E actually shipping. Pilot deployment findings are blocked on hardware access.
5. Anything else `08-master-checklist.md` still lists as `[ ]` or `[~]`, worked in the order it lists them.

Give one summary at the end — file references for what changed, and anything left incomplete and why.
