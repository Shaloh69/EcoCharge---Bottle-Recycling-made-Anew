# EcoCharge Design System

Read this before generating or restyling ANY UI on any surface. This is the
**as-built tracker** — real tokens and real execution status. The full
**mandate** these tokens satisfy (banned patterns, verification-loop process,
per-surface screen specs, template references) now lives at
`docs/planning/02-design-mandate.md` — the two root prompt files this
document originally cited (`ECOCHARGE_FULL_REWORK_PROMPT.md` §5–7, the
hardware-clarifications addendum §3) were consolidated into `docs/planning/`
on 2026-08-10 and deleted from root; see `memory.md`. Run `/design-review`
after every meaningful UI change; the `avoid-ai-design` skill's
banned-pattern audit applies to all three surfaces.

**Status, corrected 2026-08-11 — the line above was stale and contradicted this
file's own bottom section:** real visual/component work has started on the
Admin Console and Kiosk Web (HeroUI removed from both, a first real
component/bug-fix pass done), and the public Website has been scaffolded from
scratch. See "Redesign execution status" at the bottom of this file for the
honest, evidence-qualified per-item breakdown — most items are `[~]`
(code-complete, not yet screenshot-verified), not `[x]`. Playwright MCP is now
confirmed working (2026-08-11, after two prior sessions that couldn't get it
loaded — see `memory.md`), so the actual screenshot-verification pass this
file's `[~]` items are waiting on can now proceed for real. Work order for
resuming: `docs/planning/08-master-checklist.md` Phase E (the old
`04-continue-design-redo.md` was retired 2026-08-11 — every status claim in it
had gone false, and its work order is now carried by Phase E directly).

---

## Banned patterns (all surfaces — reject on sight)

- Purple-to-blue gradients (or any decorative hero gradient)
- Inter-only typography
- Centered-hero-three-cards landing layout
- Untouched shadcn/HeroUI defaults (default radius/shadow/color = not done)
- Reflexive glassmorphism (blur panels without a functional reason)
- Icon-in-rounded-square feature tiles
- Generic spinners where a state-specific indicator is called for (kiosk §6.4)

---

## Shared product identity

The product turns recycled bottles into electricity. Color is meaning, not
decoration:

| Token | Hex | Meaning |
|---|---|---|
| `eco-green-500` | `#16A34A` | primary — recycling, sustainability, success |
| `eco-green-600` | `#15803D` | primary pressed/hover |
| `eco-green-100` | `#DCFCE7` | success surface tint |
| `volt-amber-400` | `#FBBF24` | accent — charging, energy, live power |
| `volt-amber-500` | `#F59E0B` | accent strong / warning |
| `signal-red-500` | `#EF4444` | error / critical / offline |
| `info-blue-500` | `#3B82F6` | informational only (never decorative) |

**Status convention (used identically everywhere):** green = healthy/online/
confirmed · amber = degraded/warning/pending · red = critical/offline/rejected.
Never repurpose these hues for decoration.

**Toasts — four categories, one system per surface:** success / error /
warning / info. Payment-class events (credit award, charge start/stop failure,
kiosk-offline, bin-critical) **do not auto-dismiss quickly** — minimum 10 s or
sticky with manual dismiss. Everything else: 4 s.

**Loading:** skeletons that match the final layout's exact dimensions (no
layout jump), never blank screens, never full-page spinners.

---

## Surface 1 — Admin Console (`client/web_console`): "Operations Console"

Dense, monitoring-first, **dark-mode-first**. The console's job is watching
live SSE telemetry, not marketing.

- **Background ramp (dark):** `#0A0F0D` app bg → `#111816` panel → `#1A2420`
  raised. Light mode exists but dark is the default and the design target.
  (Note the green undertone — this is EcoCharge ops, not a generic slate dashboard.)
- **Text:** `#E7F0EB` primary, `#8FA69B` secondary, `#5C7268` muted.
- **Typography:** Space Grotesk (headings/nav), IBM Plex Sans (body),
  **IBM Plex Mono for every telemetry number** — voltage, current, watts,
  bin %, credits, countdowns. Numbers are the content here; they get the mono.
- **Density:** compact tables (36 px rows), 12–13 px table text, generous data
  per screen. No card-per-metric sprawl — StatsCards only for the 5 overview
  aggregates.
- **Status colors:** the shared convention drives *everything*: kiosk
  online/offline badges, bin gauge (green < 80, amber 80–94, red ≥ 95 —
  thresholds match the server's alert logic exactly), port active/idle/error,
  ML-review confidence flags (amber < 0.70), command PENDING (amber) /
  ACKED (green) / FAILED-EXPIRED (red).
- **Live data:** SSE-driven values get a 150 ms background pulse
  (`volt-amber-400` at 15 % opacity) on change — visible heartbeat, not
  distracting. Skeletons on dashboard + analytics while SSE/queries connect.
- **Charts (analytics):** single-hue eco-green ramp for kWh/credits series,
  amber only for cost overlays, red never used in charts except true error
  series. Mono axis numerals. No gradient fills below lines. Dark-theme grid
  `#1A2420`.
- Sticky alert strip at top when any kiosk is offline or bin ≥ 95 % — red,
  does not auto-dismiss.

## Surface 2 — Kiosk Web (`client/kiosk_web`): "Clean Energy Reward"

Public touchscreen. Two modes (attract vs. in-session), big targets, zero
dead ends.

- **Light, high-contrast:** bg `#F6FBF7`, panels `#FFFFFF`, text `#14231B`;
  eco-green primary actions, volt-amber for anything about charging/power.
- **Typography:** Outfit (display — friendly, geometric, reads at 2 m),
  IBM Plex Sans body. Minimum text 20 px; primary buttons ≥ 64 px tall
  (glove/parallax-tolerant touch targets); step transitions < 2 s.
- **Attract/idle:** looping 3-panel explainer (bottle → credits → charging)
  with real product imagery, subtle functional animation only. Touch anywhere
  to start.
- **Flow = the FSM, made visible** (§6.2 step wizard): Auth → Place bottle →
  Scanning → Result → Bin confirm → (Charging) → Receipt. Every step shows
  which step you're on.
- **"Do not leave yet" moments:** SCANNING shows a persistent banner
  ("Analyzing your bottle — please don't remove it yet") for the whole state;
  bin-confirmation is its own explicit shorter wait state. Idle-timeout (to be
  built — none exists today) must be **suspended** during both.
- **Scanning animation:** Lottie composite — slow bottle rotation (mirrors the
  real conveyor nudging) + scan-line sweep, recolored to eco-green/volt-amber.
  Candidate base assets: LottieFiles "Loading Bottle" + "Scanner Loading"
  (854), Ecology-V2 pack "Plastic Recycling". Never a generic spinner here.
- **Bin full / rejects:** explicit friendly screens with a reason and a next
  action ("Bin's full — thanks for recycling! Please try again later"), never
  a raw error toast. Guest flow states plainly: "Guest credits go to a shared
  community account and can't be transferred to an account you register later."

## Surface 3 — Mobile App (`client/flutter_app`): "Clean Energy Reward"

Same palette/meaning as the kiosk; native rewards-app ergonomics.

- **Theme:** light + dark, eco-green primary, volt-amber accent reserved for
  charging/energy surfaces (charging screen, live wattage, port states).
- **Animation stack:** `skeletonizer` (loading — dimensions must match final
  layout), **Lottie** for decorative (splash, empty states, success/failure),
  **Rive** for state-driven (live charging countdown + port status ring —
  multi-state, interactive), `flutter_animate` for list/card entrances,
  `cached_network_image` for avatars/bottle photos.
- **Toasts:** same four categories; failed charge-stop and balance errors are
  sticky/long-lived.
- Credit balance is the hero number on Home — mono-tabular numerals, animated
  count-up on change, green when it increases.

---

## Existing foundation (discovered during inventory — do not duplicate)

Both web apps already carry a custom green token layer: Tailwind v4 `@theme`
vars in `styles/globals.css` ("AIRAT-NA pattern — green edition") and a fully
customized HeroUI theme in `hero.ts` (custom palette, radius, layout — the
"untouched HeroUI defaults" ban is already satisfied). The revamp **aligns and
extends** that layer rather than replacing it: map its `--green-*`/`--color-eco-*`
scale onto this file's semantic tokens. **Superseded 2026-08-10: `hero.ts` and
HeroUI are deleted entirely from `web_console`, not kept as a bridge** — see
`docs/planning/02-design-mandate.md`'s intro/§7 for the reversal and why
(the user wants a full delete-and-redo; replaced with Mantine). The purple
`--color-eco-dusk`/`--color-eco-lavender` tokens are **kept, not deleted** —
an earlier note here calling them a banned-pattern violation was wrong; the
real Figma reference (§4.6 of the mandate) confirms purple is a deliberate
accent.

## Redesign execution status

**Status key, per `05-feature-build-checklist.md`'s convention — used strictly starting 2026-08-11:** `[ ]` not started · `[~]` code-complete, **not yet screenshot-verified** · `[x]` done **and** screenshot-verified against a real running instance per §0.

**Correction, 2026-08-11: every item below previously marked `[x]` for actual UI work was checked off on the strength of a clean `tsc`/`next build` alone — no screenshot was ever taken, `/design-review` and the `avoid-ai-design` audit were never run.** §0 of `02-design-mandate.md` calls this exact discipline "the enforcement mechanism... not documentation busywork" and says explicitly not to check an item off without a real screenshot. That rule was violated, not followed. Downgraded to `[~]` below, honestly, rather than left overstated. Full accounting: `memory.md`.

- [x] Tokens defined (this file) — a documentation artifact, not a UI claim, `[x]` is accurate here.
- [x] **Playwright MCP — confirmed genuinely working 2026-08-11 (4th session)**, after two prior sessions couldn't get it to load (`memory.md`). Design-review workflow (`.claude/agents/design-review.md`, `/design-review` command, `avoid-ai-design` skill) is installed but **still never actually run as `/design-review`/`avoid-ai-design` specifically** against any surface this session — the screenshot verification below was done manually via Playwright MCP directly, not through that slash command. Run it for real before the next pass.
- [x] Dead component sweep + dependency prune (Knip-verified, both apps) — a static-analysis report, genuinely verifiable without a screenshot.
- [~] **`web_console`: HeroUI removed, replaced with Mantine 7.** **Login page — done and screenshot-verified 2026-08-11, both color schemes, against the live tunnel.** Also found and fixed the same session: a real systemic bug where Mantine's color scheme was never wired to `next-themes` (every Mantine component silently always rendered dark, regardless of the toggle — which had no reachable UI control before this session either); the sidebar (`AdminSidebar.tsx`, rendered on every authenticated page) had the same pre-Mantine gradient/glassmorphism code as login and was rebuilt the same way, plus a real light/dark toggle added since none existed. Sidebar type-checks/builds clean and is deployed but **not yet screenshot-verified behind login** (needs real admin credentials — now available, see `memory.md`/this session's chat, not yet used to re-verify). Root cause of "glassmorphism on every route" found and fixed at the source: `app/layout.tsx`'s global animated gradient-mesh background, plus ~230 lines of dead CSS it came with — deleted outright (confirmed zero real usages first). **Still not done**: the dense-table/skeleton treatment on the actual data pages (deposits, charging, credits, users, sessions, kiosks, alerts, ml-review, analytics, settings) — none of these have been individually rebuilt or screenshot-verified yet.
- [x] **`web_console`: typography — screenshot-confirmed as a side effect of the login/sidebar verification** (Space Grotesk headings visible and rendering correctly in both real screenshots this session) — not a separate check, but no longer purely unverified either.
- [~] **`kiosk_web`: HeroUI removed, replaced with shadcn/ui foundation** (typography, mascot+attribution, idle-timeout — unchanged from the prior pass). **§4.5 animated background — done 2026-08-11**: real SVG falling leaves (not Aurora — the direction changed mid-session, see `memory.md`), deployed as a real staging instance (`desktop-gklhcri:30013` + public tunnel) and screenshot-verified against it. **A real, pre-existing conflict found in the same screenshot, not yet fixed**: the idle screen's 12-fact carousel and the pre-idle splash (`app/page.tsx`) are both dark/moody, directly contradicting this mandate's "Green + White is the base identity... recognizable from across a room" rule — the single most-seen kiosk screen is currently the furthest from spec of anything in the app. **Still not done, unchanged from before**: the §4.6 component catalog (wave divider, kiosk-styled bin gauge, station picker, numeric keypad, OTP entry, halo badge) — still the largest concrete gap, and the two new sourced moments from the mandate's §2/§4.3a (bottle-fill loading, bottle-crush accept) are specified but not built.
- [~] **`flutter_app`: animation-stack dependencies — real, previously-undiscovered compile errors found and fixed 2026-08-11 (13 files referenced undefined `AppTheme` color aliases; a broken `XFile.toFile()` call on avatar upload; an incompatible `skeletonizer` version), verified via a real `flutter analyze` + `flutter build web` success, not narrated.** One real screen partially wired: `CreditBalanceCard` (Home's hero number) now does a genuine animated count-up with tabular mono numerals and a green flash on increase; `home_screen.dart`'s loading state moved from a banned generic spinner to a real `Skeletonizer` layout with staggered entrance. **Home itself not screenshot-verified** — needs a real logged-in session (credentials now available, not yet used to re-verify this screen specifically). Remaining screens (login/register, scan-kiosk, deposit history, charging, profile) still untouched — Lottie and Rive specifically have zero real usages anywhere in the app.
- [x] **`client/web` (public website) — deployed as a real staging instance and screenshot-verified 2026-08-11** (`desktop-gklhcri:30014` + public tunnel): homepage, `/download`, `/changelog`, `/update-required` all confirmed against the live instance. **App-distribution pages rebuilt for real**: `/download` is now a genuine fetch-progress download (not a static link) wired to a real, first-ever release APK (`flutter build apk --release`, 75.3MB) — verified end to end by actually downloading a byte-identical copy via Playwright, not just screenshotting the button. `/changelog` and the new `/update-required` page share one real, dated data source (`lib/changelog-data.ts`). Template references corrected 2026-08-11 away from citing sibling project EngiRent's own template choices (`memory.md`). **Not done**: `/how-it-works`, `/docs`, `/about` weren't individually re-screenshotted this pass (only home + the three app-distribution pages).
- [ ] Load the `dataviz` skill before touching the analytics charts (required
  by this repo's tooling before any chart code) — still not touched, still applies
