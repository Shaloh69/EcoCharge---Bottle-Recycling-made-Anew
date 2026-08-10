# EcoCharge — Design Mandate (Full Scrap & Remake)

This is a directive, not a menu of suggestions. The existing UI across all three original client surfaces — Admin Console, Kiosk Web, Mobile App — is to be **completely scrapped and rebuilt**, not incrementally restyled. **A fourth surface, the public Website (`client/web`, §6), was added 2026-08-10 — it doesn't exist yet, so it's a from-scratch build, not a rebuild.** This is the specification `DESIGN.md`'s tokens were derived from; `DESIGN.md` (repo root) is the living **deliverable** — the as-built tracker with real tokens and an execution-status checklist — this document is the **mandate** those tokens have to satisfy. When the two disagree, treat that as a signal `DESIGN.md` needs updating to match a decision made here, not the other way around.

**Status as of 2026-08-10, verified against code, not claimed:** tokens are defined, the component-inventory/dead-code pass is done (Knip-clean on both Next.js apps, one canonical nav component per surface, no near-duplicates found), and the verification tooling is installed (`design-review` agent, `avoid-ai-design` skill). **None of the four surfaces have been visually rebuilt yet** — grepped each surface's dependencies this session: no Space Grotesk/Outfit/IBM Plex font wired into either Next.js app, no `react-step-wizard` on the kiosk, none of `skeletonizer`/`lottie`/`rive`/`flutter_animate` in the Flutter app's `pubspec.yaml`, and the Website (§6) has no code at all yet. This document and `DESIGN.md` describe a target state, not a completed one. **Two genuinely open blockers, specific to the Kiosk (§4.5):** the user's premade Figma designs (not yet linked here) and the product's mascot/character (visual design not yet provided) — both should be resolved before the Kiosk's visual rebuild goes beyond structural/functional work.

---

## 0. Non-negotiable process — a design doc alone is not enough

This phase is not complete when the code is written; it is complete when a screenshot of the running app proves it matches this document.

**Mandatory loop, per surface, per major screen:**
1. Build the screen.
2. Take an actual screenshot **of the real, currently-running instance** the way a person would actually reach it — not a mocked component in isolation. Once the self-hosting migration (`03-revamp-master.md` §1) lands, this means the real Cloudflare Tunnel / Tailscale Serve hostname, not `localhost`, for any surface reachable that way; until then, the real dev/staging instance is acceptable but must be stated as such in `DESIGN.md`, not silently implied to be more than it is.
3. Compare that screenshot against this document's spec for that surface, checking each of these explicitly rather than an impression of "looks styled":
   - **Contrast**: every piece of text legible at a glance — no gray-on-dark or gray-on-light combinations that require squinting.
   - **Palette**: for the Admin Console, eco-green primary, volt-amber accent, and the red/amber/green status convention must all actually be visible somewhere on the screen — not just green used once for a nav highlight while everything else defaults to library gray. For the Kiosk and Mobile App, the same rule applies to eco-green + volt-amber.
   - **Every component named in this document's spec for that screen is actually present and rendering**, with real or realistic placeholder data if live data is empty. An empty-state table row is fine; a missing chart entirely is not.
4. If it doesn't match on any of the above — fix it and re-screenshot. Repeat until it matches.
5. Only then move to the next screen.

**Deliverable: keep `DESIGN.md` current**, containing the design system as actually implemented (not aspirational), a before/after screenshot section per surface, and a short rationale per surface useful for the thesis write-up. Do not check off an item in `DESIGN.md`'s execution-status list without the screenshots to back it up.

**Run `/design-review` after every meaningful UI change** — the agent and slash command are already installed (`.claude/agents/design-review.md`). Run the `avoid-ai-design` skill's banned-pattern audit alongside it.

**Before touching the Admin Console's analytics charts specifically**, load the `dataviz` skill first — this repo's own tooling convention, not optional.

---

## 1. Banned patterns — all surfaces, reject on sight

| Banned | Why |
|---|---|
| Purple-to-blue gradients (or any decorative hero gradient) | Generic SaaS tell |
| Inter-only typography | The single most common AI/template tell |
| Centered-hero-three-cards landing layout | Generic template default |
| Untouched shadcn/HeroUI defaults (default radius/shadow/color) | Both Next.js apps already carry a custom green token layer and a customized HeroUI theme (`hero.ts`) — this ban is already satisfied at the token level; don't let new components regress it by pulling in unthemed defaults |
| Reflexive glassmorphism (blur panels with no functional reason) | Decoration without purpose |
| Icon-in-rounded-square feature tiles | Generic template default |
| Generic spinners where a state-specific indicator is called for | The kiosk's Scanning state especially — see §3.3 |

---

## 2. Shared product identity

The product turns recycled bottles into electricity. Color is meaning, not decoration.

| Token | Hex | Meaning |
|---|---|---|
| `eco-green-500` | `#16A34A` | primary — recycling, sustainability, success |
| `eco-green-600` | `#15803D` | primary pressed/hover |
| `eco-green-100` | `#DCFCE7` | success surface tint |
| `volt-amber-400` | `#FBBF24` | accent — charging, energy, live power |
| `volt-amber-500` | `#F59E0B` | accent strong / warning |
| `signal-red-500` | `#EF4444` | error / critical / offline |
| `info-blue-500` | `#3B82F6` | informational only (never decorative) |

**Status convention (identical everywhere):** green = healthy/online/confirmed · amber = degraded/warning/pending · red = critical/offline/rejected. Never repurpose these hues for decoration.

**Toasts — four categories, one system per surface:** success / error / warning / info. Payment-class events (credit award, charge start/stop failure, kiosk-offline, bin-critical) **do not auto-dismiss quickly** — minimum 10s or sticky with manual dismiss. Everything else: 4s.

**Loading:** skeletons matching the final layout's exact dimensions (no layout jump). Never blank screens, never full-page spinners.

**Open item, not yet specified — flag before building, don't invent it silently:** unlike a spacing/radius scale being explicitly locked (e.g. an 8px grid with a hard radius cap), `DESIGN.md` doesn't currently define one for EcoCharge. Given "untouched shadcn/HeroUI defaults" is banned and both apps already carry a customized `hero.ts` theme, check what radius/spacing that theme already commits to before inventing a new scale — but if it turns out to be unset or inconsistent, that's a real open question for the user, not something to guess at silently.

---

## 3. Surface 1 — Admin Console (`client/web_console`): "Operations Console"

Dense, monitoring-first, **dark-mode-first**. The console's actual job is watching live SSE telemetry (`analyzation.md` §10's dashboard pages: overview, kiosks + kiosk detail, sessions, deposits, charging, credits, users, alerts, ml-review, analytics, settings), not marketing.

- **Background ramp (dark):** `#0A0F0D` app bg → `#111816` panel → `#1A2420` raised. Light mode exists but dark is default and the design target.
- **Text:** `#E7F0EB` primary, `#8FA69B` secondary, `#5C7268` muted.
- **Typography:** Space Grotesk (headings/nav), IBM Plex Sans (body), **IBM Plex Mono for every telemetry number** — voltage, current, watts, bin %, credits, countdowns.
- **Density:** compact tables (36px rows), 12–13px table text. StatsCards only for the overview aggregates, not a card-per-metric sprawl.
- **Status colors drive everything:** kiosk online/offline badges, bin gauge (green < 80%, amber 80–94%, red ≥ 95% — thresholds match the server's real alert logic in `analyzation.md` §8's `/alerts` endpoint exactly, don't invent separate UI thresholds), port active/idle/error, ML-review confidence flags (amber < 0.70, matching the server's real default threshold), command PENDING (amber) / ACKED (green) / FAILED/EXPIRED (red).
- **Live data:** SSE-driven values get a 150ms background pulse (`volt-amber-400` at 15% opacity) on change. Skeletons on dashboard + analytics while SSE/queries connect.
- **Charts:** single-hue eco-green ramp for kWh/credits series, amber only for cost overlays, red never used except true error series. Mono axis numerals. No gradient fills below lines.
- **Sticky alert strip** at top when any kiosk is offline or bin ≥ 95% — red, does not auto-dismiss.

**Templates to pull structure from, not code verbatim:** Next.js shadcn Dashboard Starter or TailAdmin — evaluate specifically for real-time data-display components (live SSE-driven tables/badges), since this console's job is watching live telemetry, not CRUD.

---

## 4. Surface 2 — Kiosk Web (`client/kiosk_web`): "Clean Energy Reward"

Public touchscreen. Two modes (attract vs. in-session), big targets, zero dead ends.

- **Light, high-contrast:** bg `#F6FBF7`, panels `#FFFFFF`, text `#14231B`; eco-green for primary actions, volt-amber for anything about charging/power.
- **Typography:** Outfit (display — reads at 2m), IBM Plex Sans (body). Minimum text 20px; primary buttons ≥ 64px tall (glove/parallax-tolerant touch targets, kiosk-industry floor); step transitions < 2s.
- **Attract/idle:** looping 3-panel explainer (bottle → credits → charging), real product imagery, subtle functional animation only. Touch anywhere to start.

### 4.1 The flow = the real FSM, made visible

Build with `react-step-wizard`. Map `analyzation.md` §6 directly into visible steps, not hidden state:

1. **Auth** — QR scan or Continue as Guest.
2. **Place bottle** — entrance ultrasonic detection.
3. **Scanning** — the flow's most important "do not leave yet" moment. The conveyor nudges the bottle every 2s for fresh camera angles while the AI pipeline runs. Persistent banner: "Analyzing your bottle — please don't remove it yet," shown for the whole `SCANNING` state duration, not a generic spinner.
4. **Result** — accept (credits shown clearly with the volume tier that determined the amount) or reject (bottle returned via conveyor reverse, with a reason if the AI provided one).
5. **Bin confirmation** — its own explicit shorter wait state, not folded silently into the result screen, since this can independently time out and flip to rejected (`analyzation.md` §6, step 8).
6. **Charging** (optional path) — port selection, credit amount, live countdown once active.
7. **Receipt/done** — auto-return to idle.

### 4.2 Idle-timeout — build fresh, FSM-aware from day one

There is currently **no idle-timeout behavior at all** (confirmed: the one prior attempt, `hooks/useIdle.ts`, had zero importers and was deleted in the dead-code sweep). This isn't a bug to fix, it's greenfield work — and it must be built already aware of the FSM: idle-timeout-to-attract-mode **must be suspended** during `SCANNING` and bin-confirmation. A user is *supposed* to stand still during these states; the kiosk resetting to the attract screen mid-scan directly contradicts its own "please wait" instruction. Test directly: trigger a deposit, don't touch the screen through the normal idle-timeout window, confirm the screen stays on the scanning/confirmation state rather than reverting.

### 4.3 Scanning animation — a spinning bottle, not a generic spinner

Composite Lottie animation: slow bottle rotation (mirrors the real conveyor nudging the bottle for different camera angles — literally true to what's happening) + a scan-line sweep, recolored to eco-green/volt-amber. Candidate base assets: LottieFiles "Loading Bottle," "Scanner Loading" (854), the Ecology-V2 pack's "Plastic Recycling" animation. Implement via Lottie, not hand-rolled CSS keyframes.

### 4.4 Bin-full and reject states — explicit, friendly, never a raw error

The server already refuses new deposits at bin ≥ 95% (`409 bin_full`, shipped in the security/cleanup pass) — the kiosk UI has no matching screen for it yet. Build: "Bin's full — thanks for recycling! Please try again later," with a next action, never a raw error toast.

**Guest disclosure — required copy, not yet built.** Guest deposits credit a shared pooled account by design (confirmed, not changing — see `memory.md`). The kiosk flow must state this plainly before or during the guest path: "Guest credits go to a shared community account and can't be transferred to an account you register later." This was flagged as a real UX gap (a first-time guest otherwise has no reason to assume registering later won't retroactively claim their credits) and belongs to this redesign pass, not a separate ticket.

### 4.5 Kiosk-specific clarifications, 2026-08-10 — read before starting the kiosk rebuild

**The kiosk PC is a separate physical machine and does not have Tailscale set up yet.** Confirmed by the user directly — this is a real infra task, tracked in `03-revamp-master.md` §1.1a, not just a design note. It doesn't change the runtime networking decision already made (the kiosk still reaches the API server over the public Cloudflare Tunnel, per §1.1/§1.2 of that document, precisely because it's out in the field on its own network) — Tailscale on the kiosk PC is for **remote admin/dev access** (SSH, log checks, deploys) alongside that public runtime path, not a replacement for it.

**Palette — confirmed, restated plainly: Green + White is the base.** This isn't a new direction, it's the same "Clean Energy Reward" identity already specified in §2/§4 (eco-green primary, white/near-white surfaces) — but stated explicitly here because it's the one thing not to drift from during the rebuild. Volt-amber stays the accent for anything charging/power-related, and **additional supporting colors are allowed** where a screen genuinely needs a third signal (e.g. `signal-red-500` for a rejected/error state, per §2's shared status convention) — but green-on-white is the identity a person should recognize the kiosk by from across a room, not one accent color among several competing for attention.

**Animated background — mandatory, not yet specified with a real component before now.** Static flat backgrounds on the idle/attract screen are a fail condition, same reasoning as the shared foundation in §2. Real, verified-available options (found 2026-08-10, evaluate against the green/white palette before picking one):
- **[react-bits Aurora](https://reactbits.dev/backgrounds/aurora)** — WebGL (`ogl`), the same technique already reference-checked for kiosk-class idle screens elsewhere; recolor to eco-green rather than its default palette.
- **[shadcn.io Aurora Background](https://www.shadcn.io/background/aurora)** — pure CSS, no WebGL dependency, "emerald and teal waves" out of the box, genuinely close to this palette already.
- **[Aceternity UI Aurora Background](https://ui.aceternity.com/components/aurora-background)** — pure CSS, respects `prefers-reduced-motion`, light *and* dark mode support (the kiosk itself is light-only per §4, but the component supporting both doesn't hurt).
- **[Stianlars1/react-gradient-animation](https://github.com/stianlars1/react-gradient-animation)** (GitHub) — a highly customizable animated gradient background component, real open-source code to vendor rather than an opaque dependency.

Same hard constraints as any animated background used elsewhere in this project: never behind body copy/tabular data at full strength, `prefers-reduced-motion` freezes it to a static first frame, and it must degrade gracefully (a CSS gradient fallback, never a blank rectangle) if WebGL context creation fails — relevant here specifically because kiosk hardware is exactly the kind of constrained environment where that can happen.

**Template references — real, found 2026-08-10, use these as starting structure, not a blank canvas:**
- **[Reverse Vending Machine](https://www.figma.com/community/file/1358993306195421470/reverse-vending-machine)** (Figma Community) — closest direct domain match, use its flow/screen structure first.
- **[Self Service Kiosk](https://www.figma.com/community/file/1475972798185896799/self-service-kiosk)** (Figma Community) — general self-service touchscreen patterns, already referenced in §6 below.
- **[Vending Machine Kiosk](https://www.figma.com/community/file/1400020290371430370/vending-machine-kiosk)** (Figma Community) — rewards-points/coupon flow, structurally close to the credits concept here.
- **[Recycling App | UI Design](https://www.figma.com/community/file/1165246885611208493/recycling-app-ui-design)** (Figma Community) — for the eco/recycling visual language specifically, cross-pollinate with the Mobile App surface (§5) too, since both share the same identity.

**Pre-made Figma designs exist and take priority over the above once shared.** The user has their own premade Figma designs for this product — **not yet linked in this document, genuinely blocking**: don't build final screens from the template references above without checking against the real Figma file first once it's provided. Treat the templates above as a fallback/starting-structure reference only if the real designs turn out not to cover a given screen.

**The product has its own mascot/character.** Confirmed by the user, **visual design not yet provided — genuinely blocking for anything mascot-specific.** Once available, the mascot's placement needs deciding across at minimum: the idle/attract loop (a natural home for character personality), the bin-full/reject friendly-error screens (§4.4 — a mascot reacting is a stronger "sorry, try later" than a bare icon), and the bin-confirmed/success moment. Don't invent a placeholder character in the meantime — leave the slot specified but unfilled rather than shipping a generic stand-in that then has to be torn out.

---

## 5. Surface 3 — Mobile App (`client/flutter_app`): "Clean Energy Reward"

Same palette/meaning as the kiosk; native rewards-app ergonomics.

- **Theme:** light + dark, eco-green primary, volt-amber accent reserved for charging/energy surfaces (charging screen, live wattage, port-state indicators).
- **Animation stack:** `skeletonizer` for loading (dimensions must match final layout — no layout jump), **Lottie** for decorative (splash, empty states, success/failure), **Rive** for state-driven (live charging countdown + port-status ring — multi-state, interactive, the right tool for this specifically, not Lottie), `flutter_animate` for list/card entrances, `cached_network_image` for avatars and any bottle-photo display.
- **Toasts:** same four-category system; failed charge-stop and balance errors are sticky/long-lived.
- **Credit balance is the hero number on Home** — mono-tabular numerals, animated count-up on change, green when it increases.

**Reference point for screen inventory:** `analyzation.md` §13's current real screen list (splash/onboarding → login/register → home → scan kiosk QR → credit balance/transactions → deposit history → charging view/stop → profile) is the floor, not the ceiling — this redesign pass rebuilds the presentation layer of each of these, it doesn't need to invent new ones unless a genuine gap surfaces during the rebuild.

---

## 6. Surface 4 — Public Website (new, `client/web`) — promotional, changelog, docs, app download

**New, 2026-08-10 — this surface doesn't exist in the repo yet.** No prior version to redesign; this is a from-scratch build, not a rebuild like the other three surfaces. Added at the user's explicit request, modeled on the same pattern already proven on a sibling project: a real promotional site, not a stub.

**What it's for:** the public face of EcoCharge — what the product is, how it works, a real dated changelog, public documentation (distinct from the internal `docs/planning/` audience — this is for a visitor, not a contributor), and a page to download the mobile app.

**Template reference, real link:** **[Velora UI](https://github.com/ColorlibHQ/velora-ui)** (browsable live at [velora.colorlib.com](https://velora.colorlib.com/)) — free, MIT-licensed, Next.js 16 + Tailwind CSS 4 + Motion, ships a complete multi-page site (home, pricing, blog, changelog, auth, 404) built from 32+ animated components, including an aurora hero background installable directly via the shadcn CLI (`npx shadcn@latest add https://velora.colorlib.com/r/aurora-background.json`). Genuinely strong fit for two reasons: it's a real, complete site to adapt rather than build from a blank page, and its aurora hero is the same technique already specified for the Kiosk's idle screen (§4.5) — reusing it here (re-themed to eco-green/white instead of Velora's default) gives the whole product one consistent animated-background language across two surfaces instead of two unrelated ones.

**Tooling note, same exception already established for a comparable surface elsewhere:** Velora UI's shadcn/ui-based stack is a deliberate departure from HeroUI (used by `client/kiosk_web`/`client/web_console`) — acceptable here specifically because this surface shares no components and no user session with the other three; don't try to reconcile the two component systems.

**Pages to build, using Velora UI's real page set as the starting skeleton:**
- **Home** — hero (aurora background, re-themed), the real EcoCharge lifecycle (bottle → AI grading → credits → charging), a "how it works" walkthrough, footer.
- **Changelog** — real, dated entries sourced from what actually shipped (git history / `memory.md`'s decision log are the honest source — never invented to make a release look more substantial than it was, same rule as `06-must-have-app-features.md` §4).
- **Docs** — public-facing product documentation (how the kiosk works, how credits/charging work, FAQ) — **not** a mirror of `docs/planning/`, which is internal/contributor-facing.
- **Download** — the mobile app. **No evidence this app is published to any app store** (checked: `analyzation.md`/`docs/PROJECT_ANALYSIS.md` never mention one) — build this as a direct APK download page (Velora UI's own `/docs`-adjacent download-flow pattern, or a simple dedicated route) rather than linking a store listing that doesn't exist. If a real store listing ever does get published, repoint this page then — don't build toward an assumed listing now.
- **About** — thesis/academic context, matching this being a real academic project.

**Palette:** same "Clean Energy Reward" identity as the Kiosk and Mobile App — green + white base, volt-amber accent — **not** the Admin Console's dark "Operations Console" palette, which is a deliberately separate problem (an internal ops tool, not a public-facing surface).

**Hosting:** public, via the Cloudflare Tunnel set up in `03-revamp-master.md` §1.1 — this is exactly the kind of service that tunnel exists for. Route it on its own subdomain (or the bare `ecocharge.dpdns.org` root, with the API/kiosk on their own subdomains) — decide the exact hostname split when the tunnel's Public Hostnames are actually configured, not before.

---

## 7. Existing foundation — do not duplicate

Both web apps already carry a custom green token layer: Tailwind v4 `@theme` vars in `styles/globals.css` and a fully customized HeroUI theme in `hero.ts` (custom palette, radius, layout). The revamp **aligns and extends** that layer rather than replacing it: map its existing `--green-*`/`--color-eco-*` scale onto this document's semantic tokens, keep `hero.ts` as the HeroUI bridge, and delete any decorative colors that violate §1's banned list (the prior audit found `--color-eco-dusk` and a purple `--color-eco-lavender` family — confirm these are actually gone before starting new work, don't assume the earlier deletion note is still accurate without checking).

---

## 8. Sequencing

Component inventory (Knip sweep, nav catalog) is done — confirmed clean, no consolidation needed before starting on the three existing surfaces (it obviously doesn't apply to the new Surface 4, which has no existing components to inventory). Do the visual rebuild in this order: Admin Console first (dense, highest-value telemetry surface, and the one furthest from done), then Kiosk Web (needs the idle-timeout and step-wizard built from scratch, not just restyled — and is blocked on the Figma-designs and mascot questions in §4.5 for anything beyond structural/functional work), then the Mobile App, then the new Public Website (§6) — it's independent of the other three and could in principle move earlier if the Figma/mascot blockers on the Kiosk drag on, but is placed last here since it has no existing user-facing gap the way the other three do. Update `DESIGN.md`'s execution-status checklist and `memory.md` as each surface actually ships, with screenshots — not before.
