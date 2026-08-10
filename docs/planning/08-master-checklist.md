# EcoCharge — Master Checklist (consolidates 00–07)

Every actionable item across `docs/planning/00-07`, in the order `00-start-here.md` says to work them, with real current status as of 2026-08-11 — not assumed, checked against actual code/infra where checkable. Built after an honest self-audit found several items in `DESIGN.md` had been marked done without the mandatory screenshot verification (`memory.md`, 2026-08-11 entry) — this file exists so "follow the plan" has one real place to check against, instead of five documents that can silently drift out of sync with each other again.

**Status key:** `[ ]` not started · `[~]` in progress / code-complete but not fully verified · `[x]` done and verified · `[!]` blocked on a decision only the user can make — do not silently guess.

---

## Phase A — Self-hosting migration (`03-revamp-master.md` §1)

- [x] §1.0 Folder layout on Disk D (`D:\EcoCharge\mysql\`, `\supabase\`, `\backups\`, `\logs\`)
- [x] §1.3 MySQL running in Docker, healthy, port 13306 (not 3306/3307 — both already taken on the shared machine)
- [x] §1.4 Self-hosted Supabase — **re-verified 2026-08-11: all 10 services healthy** (`db`, `kong`, `studio`, `imgproxy`, `edge-functions`, `auth`, `meta`, `pooler`, `rest`, `storage`, `realtime`). Several were stuck in `Created` (never actually issued a start) rather than crash-looping — a second `docker compose up -d` got them all running; `auth` genuinely ran its real migrations this time with no password error, confirming the wipe-and-reinit fix from the prior session actually worked.
- [ ] §1.3 step 3: dump Aiven → restore into the Docker MySQL instance (the actual data migration — not yet done; local MySQL is empty)
- [ ] §1.4: rewire `storageService.ts` / the avatar-upload handler to the self-hosted Supabase URL + new service-role key
- [ ] §1.4 step 7: build the avatar-proxy route on the Node API (recommended exposure approach) — or, if not building it, explicitly decide on the Storage-scoped-hostname fallback instead
- [ ] §1.5: persistent Windows services for the Node API + both Next.js apps (NSSM or PM2) — currently none of the three survive a terminal close or reboot
- [ ] §1.1: register the `dpdns.org` subdomain, add it to Cloudflare, create the named Tunnel, route Public Hostnames
- [ ] §1.1 step 5: confirm the origin isn't reachable outside the tunnel
- [ ] §1.6 step 4 / §2 item 1: repoint all four clients (firmware, kiosk web, Flutter default, admin console) at the single stable hostname
- [ ] §1.6 step 7: decommission Render + Aiven — **only after everything above is proven under real use**

## Phase B — `analyzation.md`'s original five issues (`03-revamp-master.md` §2)

- [x] Kiosk endpoint auth (`/list`, `/:id/ports`, `/:id/sse`)
- [x] Legacy dead code removed (Flask prototype, unused files)
- [x] Guest pooled balance — kept, rate-limited
- [x] Device-key timing — accepted as-is
- [ ] Item 1 (inconsistent backend URLs) — tied to Phase A, not done until the tunnel exists
- [ ] Item 2 (rotating quick-tunnel AI URL) — tied to Phase A
- [!] Item 3 (secrets committed to git) — **key rotation itself needs your go-ahead** (`03-revamp-master.md` §2 item 3); the NVS/provisioning-portal code change can be built ahead of that, but rotating the actual keys is not mine to do unilaterally

## Phase C — Firmware fixes (`03-revamp-master.md` §3.2/§3.3, `AUDIT.md`)

- [!] **`BOTTLE_SCAN_TIMEOUT_MS=60000` and `BOTTLE_BIN_RECHECK_MS=4000`/3-sample debounce — proposed, not flashed. Explicit sign-off required before any flash; this is a physical hardware change, not something to proceed on "to the letter" without your review.**

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
- [ ] Explicit camera capture resolution constraints in `kiosk_web`'s `getUserMedia` call — **independent, no hardware risk, not yet done**
- [ ] Best-of-N frame capture per scan attempt — **independent, not yet done**
- [!] Reconcile the AI server's 0.40 floor vs. the kiosk's 0.5 accept floor — a product decision, ask rather than guess
- [x] Dataset merge — dropped per explicit user instruction, not pursued further

## Phase G — Testing infrastructure (`05-feature-build-checklist.md` Stage 1)

- [ ] Backend test runner + coverage of the Phase B security fixes specifically
- [ ] AI server `pytest` coverage
- [ ] End-to-end / integration scripts (happy path + the five fault paths listed in Stage 1.3)
- [ ] Hardware validation — needs physical access to the real kiosk, flag as conditional

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
- [ ] Real `npm run lint` confirmation that the `@eslint/compat` gap is actually resolved (absence of a string match isn't proof)

---

## How this gets worked

Per `00-start-here.md`: continuous sweep, don't stop for review between unblocked items. **Do** stop at every `[!]` — those are the four items above that are the user's call, not mine, and "follow the plan to the letter" includes respecting the plan's own stop conditions, not just its action items. Update this file's checkboxes as items actually complete, with the same evidence bar as the item demands (a build passing is not the same as a screenshot, per `DESIGN.md`'s corrected status list) — don't let this file drift the way `DESIGN.md` did.
