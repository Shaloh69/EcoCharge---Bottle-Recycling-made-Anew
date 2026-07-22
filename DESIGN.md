# EcoCharge Design System

Read this before generating or restyling ANY UI on any surface. Written fresh
for EcoCharge (no prior DESIGN.md existed); constraints sourced from
`ECOCHARGE_FULL_REWORK_PROMPT.md` §5–7 and the hardware-clarifications addendum §3.
Run `/design-review` after every meaningful UI change; the `avoid-ai-design`
skill's banned-pattern audit applies to all three surfaces.

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
scale onto this file's semantic tokens, keep `hero.ts` palette as the HeroUI
bridge, and delete the decorative colors that violate the banned list
(`--color-eco-dusk` #7C3AED and `--color-eco-lavender` purple family).

## Redesign execution status

- [x] Tokens defined (this file)
- [x] Design-review workflow installed (`.claude/agents/design-review.md`,
  `/design-review` command, `avoid-ai-design` skill)
- [x] Dead component sweep + dependency prune (Knip-verified, both apps)
- [ ] Typography: replace Inter-only (banned) — Space Grotesk/Outfit + IBM
  Plex Sans + IBM Plex Mono via `next/font`, both apps
- [ ] web_console: status-convention pass (badges/gauge/ports/commands),
  toast system, skeletons, SSE pulse, sticky alert strip, density pass
- [ ] kiosk_web: step wizard, scanning banner + Lottie composite, FSM-aware
  idle timeout (none exists today — build fresh), bin-full + guest-disclosure
  screens, toasts
- [ ] flutter_app: theme rework, animation stack deps (skeletonizer/Lottie/
  Rive/flutter_animate/cached_network_image), screen-by-screen pass
- [ ] Playwright MCP for `/design-review` screenshot checking (needs MCP
  server config — not yet installed)
- [ ] Load the `dataviz` skill before touching the analytics charts (required
  by this repo's tooling before any chart code)
