# EcoCharge — Master Checklist (consolidates 00–07)

Every actionable item across `docs/planning/00-07`, in the order `00-start-here.md` says to work them, with real current status as of 2026-08-11 — not assumed, checked against actual code/infra where checkable. Built after an honest self-audit found several items in `DESIGN.md` had been marked done without the mandatory screenshot verification (`memory.md`, 2026-08-11 entry) — this file exists so "follow the plan" has one real place to check against, instead of five documents that can silently drift out of sync with each other again.

**Status key:** `[ ]` not started · `[~]` in progress / code-complete but not fully verified · `[x]` done and verified · `[!]` blocked on a decision only the user can make — do not silently guess.

---

## Phase A — Self-hosting migration (`03-revamp-master.md` §1)

- [x] §1.0 Folder layout on Disk D (`D:\EcoCharge\mysql\`, `\backups\`, `\logs\`, plus new `\app\server_main\` and `\media\`)
- [x] §1.3 MySQL running in Docker, healthy, port 13306 (not 3306/3307 — both already taken on the shared machine)
- [x] **Architecture pivot, 2026-08-11, explicit user instruction ("run the whole MySQL inside docker and use that for live," "save images or media on a folder inside... the server pc," "scrap and dump the whole aiven and supabase," "you dont need to access aiven or supabase")** — supersedes the self-hosted-Supabase plan from 2026-08-10. Full reasoning: `memory.md`.
- [x] §1.3: Docker MySQL is now the live system of record. No Aiven data migration — confirmed dead by DNS the same day this was decided, and explicitly abandoned by the user regardless. Fresh schema created via `npx prisma db push` (not `migrate deploy` — **real gap found**: this repo's `prisma/migrations/` has only incremental ALTER migrations, no baseline that creates tables, so `migrate deploy` fails P3018 on a truly empty DB; `db push` is the correct tool here, documented in `03-revamp-master.md` §1.3). Seeded via `npm run seed` — admin user, Kiosk-001, 9 settings keys.
- [x] §1.4: Supabase (cloud **and** the self-hosted Docker stack built 2026-08-10) fully decommissioned. The self-hosted stack was torn down (`docker compose down -v` — containers + volumes removed; vendored compose project files left on disk at `D:\EcoCharge\supabase\` in case ever wanted again, but nothing running) and its auto-start scheduled task (`EcoChargeSupabaseUp`) deleted. `users.ts`'s avatar route now writes directly to local disk (`MEDIA_STORAGE_PATH`, default `D:\EcoCharge\media` in production) and the Node API serves it back via `express.static` at `/media` — no bucket, no second service. `@supabase/supabase-js` removed from `package.json`; `SUPABASE_*` env vars removed from `.env`/`.env.example`/`.env.production.example`.
- [x] §1.5: Node API deployed and running as a persistent service on `desktop-gklhcri` — `D:\EcoCharge\app\server_main` (dist + prisma + src, since `prisma/seed.ts` runs via `tsx` and needs real source), scheduled task `EcoChargeAPI` (`ONSTART` trigger, `run_server.bat` with a crash-restart loop — same pattern already proven for the AI training jobs, since NSSM/PM2 are both absent from that machine). **Verified working**: process live, `/health` returns 200 against the real Docker MySQL connection. **Real port conflict found and fixed**: 3000 and 3001 were already bound by EngiRent's Next.js apps on the same shared machine — EcoCharge's API now runs on 30010. **Not verified**: behavior across an actual reboot (inferred from the training-task pattern, not independently tested — rebooting a shared machine mid-training wasn't reasonable to test just for this).
- [x] §1.5: admin console (`web_console`) deployed to `desktop-gklhcri` as a persistent service — `D:\EcoCharge\app\web_console`, `EcoChargeAdminConsole` scheduled task (`ONSTART`, same crash-restart `.bat` pattern), port 30011, `NEXT_PUBLIC_API_URL` baked in as `http://desktop-gklhcri:30010` (tailnet-reachable). `ALLOWED_ORIGINS` on the API updated to include it. **Verified working**: both `/health` (API) and `/login` (console) return 200 from a real running instance. Kiosk web is **not** deployed here — per §1.1 it runs on its own field PC, not this server.
- [x] **Real bug found and fixed while verifying the above, 2026-08-11**: `runMigrations()` runs `prisma migrate deploy` on every API startup and treats any failure as fatal; a `db push`-bootstrapped schema has no migration history, so it hit `P3005` and crash-looped forever (Task Scheduler kept respawning it every 5s) while still briefly answering `/health` on each spawn — easy to miss with a single check. Fixed with a proper self-healing handler in `src/startup.ts` (mirrors the existing `P3009`/`P3018` handlers), not just a one-off manual baseline. See `03-revamp-master.md` §1.3 step 6.
- [x] **§1.1 Cloudflare Tunnel — resolved 2026-08-11, user explicitly chose the free quick-tunnel path over a named tunnel + owned domain**, after being told plainly that Cloudflare itself doesn't offer a free *stable* hostname (only two real options exist: a free-but-rotating `trycloudflare.com` quick tunnel, or a named tunnel that requires adding a domain — even a free third-party one like `dpdns.org` — as a Cloudflare zone). User chose the quick tunnel. **Live now**: `cloudflared tunnel --url http://localhost:30010` running on `desktop-gklhcri` as a persistent Task-Scheduler service (`EcoChargeTunnelAPI`, same crash-restart `.bat` pattern — real bug hit and fixed here too: redirecting stdout and stderr to the *same* file with two separate `>>` operators silently prevented cloudflared from ever launching; fixed by using separate files, matching the pattern already used in `run_server.bat`/`run_web_console.bat`). Current URL: `https://lap-trace-reach-forwarding.trycloudflare.com` — **verified reachable from the public internet** (`curl` from the dev machine, not just Tailscale), confirmed proxying to the real `/health` endpoint.
- [x] **Consequence of the quick-tunnel choice flagged, then explicitly accepted by the user 2026-08-11**: this URL rotates on every restart of the tunnel process (crash, task recycle, reboot). Told plainly that this is incompatible with the ESP32's compile-time `RENDER_BASE_URL` and a shipped Flutter default. **User's response: "ITs fineee to use the ESP 32 the pc will never turn off or the cloudfare will never reboot"** — explicit acceptance of the risk, not a misunderstanding (the tradeoff was stated first). Proceeded on that basis: `esp/ecocharge/include/config.h`'s `RENDER_BASE_URL` and `client/flutter_app/lib/services/api_service.dart`'s default `_base` both updated to the current tunnel URL, with a comment pointing at where to find the current URL if it ever does change. `client/kiosk_web/.env.local` (gitignored, local-only) updated the same way. **Not done, confirmed deferred by the user 2026-08-11: "as of now all hardware is not accessable also the kiosk skip that for now."** Neither the ESP32 nor the kiosk itself is physically reachable right now. Source (`config.h`) is ready and committed — flashing is a real, standing to-do whenever hardware access exists again, not abandoned. Don't re-ask where the hardware is until the user brings it up; they've said it's just unavailable for now, not that a location needs figuring out.
- [x] Admin console is **not** tunneled — stays Tailscale-only per the original team-only design rationale, since "use it for everything, also the API" was read as covering the public-facing pieces rather than overriding that. Flagged to the user; can be added if they actually want it public.
- [x] §1.1 step 5: confirmed the origin responds correctly through the tunnel (`curl .../health` → 200) — the deeper "not reachable any other way" check doesn't really apply to a quick tunnel the same way it would a named one, since there's no separate public IP exposure to accidentally leave open here.
- [x] §1.6 step 4 / §2 item 1: firmware, kiosk web, and the Flutter default now all point at the live tunnel hostname (`https://lap-trace-reach-forwarding.trycloudflare.com`) — consistent by design, not by coincidence: these are the three "off-box" clients that genuinely need a public path. Admin console deliberately points at the tailnet address instead (`http://desktop-gklhcri:30010`), since it never leaves the tailnet — not an inconsistency, a different exposure tier on purpose. `ALLOWED_ORIGINS` still also lists the old `*.onrender.com` origins alongside the new tailnet one — harmless to leave until Render is actually decommissioned (§1.6 step 8), remove then.
- [ ] Local dev `DATABASE_URL`: the live `.env`'s `DATABASE_URL` now points at `127.0.0.1:13306`, correct only when the Node API runs on `desktop-gklhcri` itself — local laptop dev against this same DB needs either an SSH tunnel or a separate local MySQL; not set up, not blocking anything yet
- [ ] §1.6 step 8: decommission Render (the two Next.js apps) — **only after they're moved to persistent services and proven under real use.** Aiven needs no decommissioning — already unreachable and abandoned, nothing left pointing at it.

## Phase B — `analyzation.md`'s original five issues (`03-revamp-master.md` §2)

- [x] Kiosk endpoint auth (`/list`, `/:id/ports`, `/:id/sse`)
- [x] Legacy dead code removed (Flask prototype, unused files)
- [x] Guest pooled balance — kept, rate-limited
- [x] Device-key timing — accepted as-is
- [x] Item 1 (inconsistent backend URLs) — done, see Phase A
- [x] **Item 2 (rotating quick-tunnel AI URL) — resolved 2026-08-11, and a real inconsistency found in the process**: `server_main/.env`'s `AI_SERVER_URL` and `kiosk_web/.env.local`'s `AI_URL` were pointing at two *different* dead quick-tunnel URLs (`broke-kills-clear-hostels...` vs `serves-passage-server-oxygen...`, both unreachable — confirmed via `curl`, not assumed). Root cause: the AI server (`server_AI`) wasn't actually running anywhere. **Fixed by actually deploying it**: `D:\EcoCharge\app\server_AI` on `desktop-gklhcri`, reusing the training venv (`scripts\.venv`, already has torch/ultralytics/fastapi — only `python-dotenv` needed adding), persistent via Task Scheduler (`EcoChargeAIServer`, port 30012) plus its own quick tunnel (`EcoChargeTunnelAI`). Both models load cleanly and `/health` responds. All three consumers (`server_main/.env`, `kiosk_web/.env.local`, `esp/ecocharge/include/config.h`) now point at the same live URL: `https://recipient-beliefs-landscapes-established.trycloudflare.com` — verified reachable from the public internet. Same rotation caveat as the API's own tunnel applies here too.
- [x] **Bonus finding while doing the above: YOLO26 detector training (started earlier this project) had actually finished**, unnoticed until this check — `runs/detect/ecocharge_bottle_det/weights/best.pt`, real test-set metrics: **mAP50 0.9950, mAP50-95 0.9447, Precision 0.9988, Recall 1.0000**. These fresh weights are now what the deployed AI server actually uses (replaced the stale April-dated `best_detector.pt` it had been pointing at). The classifier (`best_classifier.pt`) is still the original April weights — **not retrained this session**, `scripts/train_bottle_classifier.py` was never run. Worth flagging for the thesis evidence pack (Phase H) as a real, dated result.
- [!] Item 3 (secrets committed to git) — **key rotation itself needs your go-ahead** (`03-revamp-master.md` §2 item 3); the NVS/provisioning-portal code change can be built ahead of that, but rotating the actual keys is not mine to do unilaterally

## Phase C — Firmware fixes (`03-revamp-master.md` §3.2/§3.3, `AUDIT.md`)

- [~] **Both fixes implemented in source 2026-08-11 — safe to write given hardware is confirmed unreachable (nothing to accidentally flash). Still `[!]` for the actual flash, which needs explicit sign-off + physical access, neither available right now.**
  - `BOTTLE_SCAN_TIMEOUT_MS=60000`: `esp/ecocharge/src/bottle_fsm.c` — SCANNING now tracks its own entry tick (`scan_start_tick`, separate from the per-nudge timer) and transitions to REJECTING if 60s pass with no approve/reject command, setting a new `s_scan_timed_out` flag first. Flag persists through the IDLE period that follows (cleared on the *next* scan start, matching the existing `s_bin_confirmed` lifecycle convention — not cleared on idle-entry, which would race the telemetry task).
  - `BOTTLE_BIN_RECHECK_MS=4000` / `BOTTLE_BIN_CONFIRM_SAMPLES=3`: `CONFIRMING` no longer just waits and reports — if it got there via a DROPPING timeout (not a direct sensor hit), it now actively re-samples the bin sensor every 100ms for up to 4s, requiring 3 consecutive positive reads before flipping confirmed. If DROPPING already got a direct hit, this recheck is skipped entirely (no ambiguity to resolve).
  - **New telemetry field wired through the full stack, not just the firmware**: `scan_timed_out` now flows firmware (`api_client.c`) → `devices.ts`'s telemetry schema/handler → both the admin and kiosk SSE broadcasts. The kiosk-facing UI treatment for it (per AUDIT.md's "so the kiosk UI can show a real reason instead of a silent reset") is **not built** — that's Phase E design work, a different kind of task; the data now exists for a future UI pass to use.

## Phase D — Product decision (`03-revamp-master.md` §3.1)

- [!] **The `ml-review` gate question — should a low-confidence AI detection hold credits pending human review, or stay the current retrospective audit trail? A real product decision, not a code question. Not answered yet.**

## Phase E — Design revamp (`02-design-mandate.md`), full spec, §0's verification loop applied for real this time

### E1 — Admin Console ("Operations Console")
- [~] HeroUI → Mantine foundation; `StatusBadge`/`BinGauge`/`StatsCard` rebuilt; `PulseValue` (SSE pulse); `StickyAlertStrip`
- [ ] Dense-table pass on every real page: overview, kiosks + kiosk detail, sessions, deposits, charging, credits, users, alerts, ml-review, analytics, settings
- [ ] Skeletons on dashboard + analytics while SSE/queries connect
- [ ] Command PENDING/ACKED/FAILED-EXPIRED badge treatment on the kiosk command audit log specifically
- [ ] **Screenshot-verify against the real running instance, both light and dark, per §0 — not done at all yet**
- [ ] Run `/design-review` and the `avoid-ai-design` skill audit — installed, never run

### E2 — Kiosk Web ("Clean Energy Reward")
- [~] HeroUI → shadcn/ui foundation; typography fixed; mascot added to idle screen; idle-timeout made FSM-aware; two real bugs fixed (`float-anim`, `prefers-reduced-motion`)
- [ ] §4.5 animated background on the idle screen (Aurora, real component chosen from the four candidates)
- [ ] §4.6 component catalog — **the largest concrete gap**: wave/blob divider, kiosk-styled bin gauge (battery shape, not the current 5-bar version), station-picker grid with occupied/available states, on-screen numeric keypad, OTP entry (bottom-sheet), success/fail halo badge
- [ ] Bin-full and guest-disclosure screens (§4.4)
- [ ] Real `react-step-wizard` flow structure (§4.1)
- [ ] Scanning banner + Lottie composite (§4.3)
- [ ] **Screenshot-verify at the real running instance, light mode only per the mandate — not done**
- [ ] Run `/design-review` and `avoid-ai-design`

### E3 — Mobile App
- [~] Animation-stack dependencies + typography wired into the existing theme
- [ ] Screen-by-screen pass actually using `skeletonizer`/`lottie`/`rive`/`flutter_animate`/`cached_network_image`
- [ ] Verify — blocked on Flutter SDK not being available in this environment; needs either the SDK installed here or manual verification by the user

### E4 — Public Website
- [~] Built from scratch: home, how-it-works, changelog, docs, about, download
- [ ] **Screenshot-verify — not done**
- [ ] Run `/design-review` and `avoid-ai-design`
- [ ] Wire the `/download` page's APK link to a real build once one exists

### E5 — Cross-cutting
- [ ] Playwright MCP install (needed for `/design-review` to actually screenshot, per `DESIGN.md`'s own open item)
- [ ] Load the `dataviz` skill before touching the Admin Console's analytics charts specifically

## Phase F — AI detection reliability (`07-ai-detection-improvements.md`)

- [ ] Firmware "nudge complete" signal — tied to Phase C's sign-off gate, same file
- [x] **Explicit camera capture resolution constraints — done 2026-08-11**: `app/session/deposit/page.tsx`'s `getUserMedia` now requests `{ width: { ideal: 1280 }, height: { ideal: 720 } }` instead of an unconstrained call, per the diagnosis that some cameras were defaulting to low resolution. Verified via a real `next build` (clean, no new errors/warnings beyond pre-existing prettier formatting noise elsewhere in the file).
- [x] **Best-of-N frame capture — done 2026-08-11, implemented as client-side sharpness selection rather than N AI-server calls**: each scan attempt now captures 3 frames ~100ms apart (fits inside the firmware's ~1.7s stationary pause between nudges — verified against `BOTTLE_SCAN_INTERVAL_MS`/`BOTTLE_NUDGE_FORWARD_MS`), scores each with a variance-of-Laplacian sharpness heuristic on a downsampled grayscale copy (standard cheap blur metric, computed in-browser, no new dependency), and sends only the sharpest frame to the AI server. Cheaper than calling `/api/detect` 3x per attempt. Verified via a real `next build`.
- [!] Reconcile the AI server's 0.40 floor vs. the kiosk's 0.5 accept floor — a product decision, ask rather than guess
- [x] Dataset merge — dropped per explicit user instruction, not pursued further

## Phase G — Testing infrastructure (`05-feature-build-checklist.md` Stage 1)

- [x] **Backend test runner + coverage of the Phase B security fixes — done 2026-08-11, from scratch (no test infra existed before)**: `vitest` added (`npm test`), 11 real tests across two files. `rateLimit.test.ts` covers the guest-session rate limiter with fake timers — allows the first 5/window, rejects the 6th, IPs don't cross-contaminate, resets after the window elapses. `auth.test.ts` covers `requireAuth`/`requireAdmin` — no token, malformed token, expired token, valid token via both the `Authorization` header and the `?token=` query param (the SSE/EventSource path specifically, since that's what the 2026-08-10 unauthenticated-endpoint fix actually depends on), and the admin-only 403 path. All 11 pass; `tsconfig.json` updated to exclude `*.test.ts` from the production build (verified — a fresh `dist/` has no test files in it).
- [x] **AI server `pytest` coverage — done 2026-08-11, from scratch**: `server_AI/tests/test_main.py`, 7 real tests run against the actual FastAPI app with the real trained models loaded (not mocked) — `/health`, missing/wrong API key (401), the `Authorization: Bearer` fallback path specifically (`kiosk_web`'s `/api/health-ai` route depends on it), non-image content-type (400), corrupt image bytes (400), and a well-formed response shape on a valid (synthetic, intentionally bottle-less) image. All 7 pass in ~26s including real model load. `requirements-dev.txt` added (`-r requirements.txt` + pytest/httpx) so test deps never ship on the deployed inference service.
- [ ] End-to-end / integration scripts (happy path + the five fault paths listed in Stage 1.3) — not done, real gap
- [ ] Hardware validation — needs physical access to the real kiosk, currently unavailable (see Phase A/C notes)

## Phase H — Thesis evidence pack (`05-feature-build-checklist.md` Stage 3)

- [ ] Formal architecture diagram
- [ ] Hardware wiring diagram
- [ ] ML evaluation report (assemble from existing `runs/detect/`/`runs/classifier/` outputs — training in progress this session is part of this)
- [ ] UI screenshots — blocked on Phase E actually shipping
- [ ] User testing summary (system usability, distinct from the paper's existing survey data)
- [ ] Pilot deployment findings — blocked on Phase A + hardware validation
- [ ] Limitations and future-work section
- [ ] Confirm the YOLO26 thesis-narrative update actually landed in the paper itself

## Phase I — Hygiene (`05-feature-build-checklist.md` Stage 4)

- [x] Root `README.md`
- [x] `client/kiosk_electron` — confirmed gone
- [x] **Real `npm run lint` run on all three Next.js apps, 2026-08-11 — the `@eslint/compat` gap is genuinely resolved**, not just absent from a string search: `web_console` and `client/web` both lint clean (0 warnings), `kiosk_web` lints clean except pre-existing `no-console` warnings (intentional debug logging, not a config problem). `eslint --fix` auto-reformatted ~19 pre-existing files in `kiosk_web` (line-wrapping only, verified via `tsc`+`next build` before committing) — a real side effect of actually running the tool, not something to have left half-applied.

---

## How this gets worked

Per `00-start-here.md`: continuous sweep, don't stop for review between unblocked items. **Do** stop at every `[!]` — those are the five items above that are the user's call (or need an action only the user can take) rather than mine, and "follow the plan to the letter" includes respecting the plan's own stop conditions, not just its action items. Update this file's checkboxes as items actually complete, with the same evidence bar as the item demands (a build passing is not the same as a screenshot, per `DESIGN.md`'s corrected status list) — don't let this file drift the way `DESIGN.md` did.
