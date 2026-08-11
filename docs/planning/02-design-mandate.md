# EcoCharge — Design Mandate (Full Scrap & Remake)

This is a directive, not a menu of suggestions. The existing UI across all three original client surfaces — Admin Console, Kiosk Web, Mobile App — is to be **completely scrapped and rebuilt**, not incrementally restyled. **A fourth surface, the public Website (`client/web`, §6), was added 2026-08-10 — it doesn't exist yet, so it's a from-scratch build, not a rebuild.** This is the specification `DESIGN.md`'s tokens were derived from; `DESIGN.md` (repo root) is the living **deliverable** — the as-built tracker with real tokens and an execution-status checklist — this document is the **mandate** those tokens have to satisfy. When the two disagree, treat that as a signal `DESIGN.md` needs updating to match a decision made here, not the other way around.

> **Status superseded — see `docs/design/README.md` for the current, screenshot-backed state.** As of 2026-08-11 the Admin Console (login, dashboard, analytics, all 11 data pages) and the Kiosk (splash, auth, plus a systemic light-identity and full-bleed-width fix that cascades to every page) have been genuinely rebuilt and screenshot-verified at real resolutions; the Website is built and deployed; the Mobile App compiles with the animation stack wired but only Home has been reworked. The 2026-08-10 paragraph below is kept as this document's own history — do not read it as current.

**Status as of 2026-08-10, verified against code, not claimed:** tokens are defined, the component-inventory/dead-code pass is done (Knip-clean on both Next.js apps, one canonical nav component per surface, no near-duplicates found), and the verification tooling is installed (`design-review` agent, `avoid-ai-design` skill). **None of the four surfaces have been visually rebuilt yet** — grepped each surface's dependencies this session: no Space Grotesk/Outfit/IBM Plex font wired into either Next.js app, no `react-step-wizard` on the kiosk, none of `skeletonizer`/`lottie`/`rive`/`flutter_animate` in the Flutter app's `pubspec.yaml`, and the Website (§6) has no code at all yet. This document and `DESIGN.md` describe a target state, not a completed one. **The Kiosk's premade Figma designs were reviewed 2026-08-10** (`EcoCharge.pdf`, 80 pages — full findings in §4.6) and are no longer a blocker.

**Mascot — resolved by the user directly, 2026-08-10, no longer a blocker.** The mascot art in the deck is inspired by/derived from Genshin Impact character designs. The user has explicitly authorized continuing to use it, on the basis that it's "for show only" — **the instruction is to keep it and add a credit/inspiration note ("inspired by the Genshin Impact character team") in the docs, not to commission original art.** This overrides this document's earlier recommendation (commission/generate an original character) — that recommendation was the right thing to flag, and it's now a settled decision, not an open item. Don't re-raise it. Full reasoning and the exact instruction are logged in `memory.md`. **Attribution requirement, concrete:** wherever the mascot appears in `DESIGN.md`'s before/after documentation or any thesis-facing material, credit it as inspired by Genshin Impact / HoYoverse's character art — this is the one actual obligation the user's decision comes with.

**Component library — reversed 2026-08-10, this is a real change from earlier in this document.** The user wants **HeroUI dropped entirely** from both Next.js surfaces, as a full delete-and-redo, not a re-theme — this supersedes §7's earlier "align and extend the existing HeroUI layer" guidance below (edited in place, not left to contradict this paragraph). Real replacements, chosen with reasoning, not defaulted to the first result:
- **Admin Console → [Mantine](https://mantine.dev/)** — genuinely different theming architecture from HeroUI (prop-driven, not Tailwind-variant-based), 120+ components, strong dark-mode support out of the box, and real dense-table/chart components suited to "Operations Console." **Correction, 2026-08-11: this section previously justified the choice by pointing at "a comparable dense ops dashboard on a sibling project" (EngiRent) — too close to "because EngiRent did it," a real risk of the two theses' admin tools reading as the same product re-skinned.** The library choice itself stands on its own merits (above) and isn't being reversed, but the *structural/layout* reference now comes from independent real sources instead: **[design-sparx/mantine-analytics-dashboard](https://github.com/design-sparx/mantine-analytics-dashboard)** (Next 16, React 18, Mantine 8, MIT, live theme customizer, real live-data-friendly modules — notifications, projects, Kanban) and **[qqharry21/nextjs-mantine-dashboard](https://github.com/qqharry21/nextjs-mantine-dashboard)** (Next 14, Mantine 7, dense DataTable-driven layout) as alternates. Use these for layout/pattern ideas, not EngiRent's own admin console — don't cross-check against EngiRent's admin UI for "what looks right" while building this one; the dark "Operations Console" identity, IBM Plex Mono telemetry, and eco-green/volt-amber status system (§3) already give this surface a distinct enough visual identity that it shouldn't need to.
- **Kiosk Web → [shadcn/ui](https://ui.shadcn.com/)** built on **[Radix UI](https://www.radix-ui.com/primitives)** or **[Base UI](https://base-ui.com/)** primitives (Base UI is the newer, MUI-maintained successor to Radix's own primitive layer — evaluate both, either is a legitimate choice) — not a pre-styled component library at all, a copy-paste-and-own-the-code approach with accessible/touch-correct primitives underneath (dialogs, focus management, keyboard nav) and zero visual opinion imposed. This is the right technical fit specifically *because* the real Figma reference (§4.6) is a bespoke aesthetic — fully pill-shaped everything, a custom wave/blob divider, a custom bin-gauge component — that a heavy pre-styled library like Mantine or MUI would fight against, not accelerate. **This also creates a real consistency win, not just a coincidence**: the new public Website (§6) already uses Velora UI, which is itself shadcn/ui-based — Kiosk Web and the Website can now genuinely share the same underlying primitive layer, even though they remain visually distinct products.
- Mobile App is unaffected — it was never on HeroUI, no change there.

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

**Loading:** skeletons matching the final layout's exact dimensions (no layout jump) for anything with a final layout to match. Never blank screens, never full-page spinners. **For the one class of wait that genuinely has no target layout to skeleton (route transitions, short async actions, app boot on Kiosk/Mobile/Website)**, decided 2026-08-11: a **bottle filling with water/liquid**, not a generic spinner — same reasoning as the already-banned "generic spinners where a state-specific indicator is called for" rule, now given a real on-brand asset rather than left unresolved. Real sources: [Filling bottle loading animation (Angelos Michalopoulos)](https://lottiefiles.com/102218-filling-bottle-loading-animation), [Free Bottle Filling Animation (Dev Ashish Deval)](https://lottiefiles.com/free-animation/bottle-filling-1DfBUZQBty), [LottieFiles "Filling Water" category](https://lottiefiles.com/free-animations/filling-water). Recolor the liquid fill to eco-green (not literal water-blue) so it reads as "credit/energy filling up," not literally water — this doubles as a nice metaphor for credit balance building on Mobile specifically. **Distinct from, and not a replacement for, §4.3's Scanning-state spinning-bottle-with-scanline composite** — that one is a specific FSM-state indicator with its own meaning (the bottle is being actively photographed); this one is the generic short-wait indicator used everywhere else a spinner would otherwise appear.

**Open item, not yet specified — flag before building, don't invent it silently:** unlike a spacing/radius scale being explicitly locked (e.g. an 8px grid with a hard radius cap), `DESIGN.md` doesn't currently define one for EcoCharge. Given "untouched shadcn/HeroUI defaults" is banned and both apps already carry a customized `hero.ts` theme, check what radius/spacing that theme already commits to before inventing a new scale — but if it turns out to be unset or inconsistent, that's a real open question for the user, not something to guess at silently.

**No shared login/auth layout across surfaces, decided 2026-08-11.** The product has four surfaces with four logins (Admin Console, Kiosk, Mobile, and — if the Website ever gains one — its own), and none of them should read as the same templated "centered card, logo, two fields, button" layout re-skinned four times; that's the same generic-template tell §1 already bans for hero layouts, just not previously written down for auth screens specifically. Each surface's login already has enough of a distinct real spec to build genuinely different layouts from, don't collapse them back into one shared pattern out of convenience:
- **Admin Console** — dark "Operations Console" identity, no wave/blob motifs (those are the Kiosk's signature, not this surface's) — a real login screen appropriate to a dense monitoring tool, not a marketing-site auth card. This is also the screen the last design-review pass found with three banned decorative gradients still on it (§0/checklist) — fixing that is part of making it look like *this* surface, not a generic auth template.
- **Kiosk** — the real deck's own login treatment (§4.6): the wave/blob divider cutting a solid-color header from a white body, the on-screen numeric keypad, the OTP bottom sheet. Already the most distinct of the four by construction.
- **Mobile** — native Flutter auth idioms (per §5), not a web-card pattern ported over.
- **Website** — only build one if a real feature needs it (e.g. a future account/download-history area); don't add a login just to have one, and if it happens, it should look like the Website's own marketing identity (green/white, Velora-family structure), not a copy of any of the other three.

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

**Correction, 2026-08-10: this section previously claimed no idle-timeout existed at all — wrong, and worth recording why the mistake happened.** `hooks/useIdle.ts` (the one prior *dedicated* attempt) did have zero importers and was correctly deleted in the dead-code sweep — but a second, independent generic activity-based timer already existed inline in `KioskRoot.tsx` (30s on the idle screen, 120s elsewhere) that the earlier audit pass simply didn't check for. The real gap was narrower than "build from scratch": the existing timer wasn't FSM-aware, so it relied on being *longer* than a normal scan rather than being genuinely suspended. **Fixed 2026-08-10**: `lib/idle-suspend.tsx` (a context + `useSuspendIdle(active)` hook) now lets `session/deposit/page.tsx` explicitly suspend the timer during `SCANNING` and bin-confirmation (`phase === "approved" && binPending`), and `KioskRoot` clears/re-arms its timer in response rather than only reacting to touch/click/mousemove events. Verified via `next build`; not yet screenshot-verified against a real running instance per §0's hardened loop — do that before checking this off in `DESIGN.md`.

### 4.3 Scanning animation — a spinning bottle, not a generic spinner

Composite Lottie animation: slow bottle rotation (mirrors the real conveyor nudging the bottle for different camera angles — literally true to what's happening) + a scan-line sweep, recolored to eco-green/volt-amber. Candidate base assets: LottieFiles "Loading Bottle," "Scanner Loading" (854), the Ecology-V2 pack's "Plastic Recycling" animation. Implement via Lottie, not hand-rolled CSS keyframes.

### 4.3a Accept moment — a bottle actually getting crushed, decided 2026-08-11

**Real, on-brand feedback for the one moment that most deserves it: a bottle successfully deposited.** The existing halo-badge (§4.6) stays as the abstract accept/reject signal shared with other success/failure moments across the product, but the Kiosk's specific bottle-accepted moment (§4.1 step 4, "Result — accept") gets a literal crush animation layered in first — the visceral "this bottle is now physically being recycled" beat the halo badge alone doesn't give. Real candidate sources found 2026-08-11: [Plastic Recycling Animation (Creative Squad)](https://lottiefiles.com/animation/plastic-recycling-13507608) (the same Ecology-V2-family asset already referenced above for Scanning — check whether it already shows a crush/compress motion before sourcing a second asset), [Waste and Recycling Management Animation Pack](https://lottiefiles.com/marketplace/waste-and-recycling-management_277977) (includes shredding/reprocessing motions, closest literal match to "crushed"), [IconScout Plastic Waste Bottles Animations](https://iconscout.com/lottie-animations/plastic-waste-bottles). Sequence: crush animation plays first (under ~1.5s, satisfying/decisive, not a lingering multi-second story), then resolves into the existing halo badge + credit amount. Recolor to eco-green/volt-amber like every other animated asset in this document — not literal trash-brown. Mirror the same crush moment on Mobile's deposit-success/history feedback (§5) for cross-surface consistency, since both surfaces represent the same real event.

### 4.4 Bin-full and reject states — explicit, friendly, never a raw error

The server already refuses new deposits at bin ≥ 95% (`409 bin_full`, shipped in the security/cleanup pass) — the kiosk UI has no matching screen for it yet. Build: "Bin's full — thanks for recycling! Please try again later," with a next action, never a raw error toast.

**Guest disclosure — required copy, not yet built.** Guest deposits credit a shared pooled account by design (confirmed, not changing — see `memory.md`). The kiosk flow must state this plainly before or during the guest path: "Guest credits go to a shared community account and can't be transferred to an account you register later." This was flagged as a real UX gap (a first-time guest otherwise has no reason to assume registering later won't retroactively claim their credits) and belongs to this redesign pass, not a separate ticket.

### 4.5 Kiosk-specific clarifications, 2026-08-10 — read before starting the kiosk rebuild

**The kiosk PC is a separate physical machine and does not have Tailscale set up yet.** Confirmed by the user directly — this is a real infra task, tracked in `03-revamp-master.md` §1.1a, not just a design note. It doesn't change the runtime networking decision already made (the kiosk still reaches the API server over the public Cloudflare Tunnel, per §1.1/§1.2 of that document, precisely because it's out in the field on its own network) — Tailscale on the kiosk PC is for **remote admin/dev access** (SSH, log checks, deploys) alongside that public runtime path, not a replacement for it.

**Palette — confirmed, restated plainly: Green + White is the base.** This isn't a new direction, it's the same "Clean Energy Reward" identity already specified in §2/§4 (eco-green primary, white/near-white surfaces) — but stated explicitly here because it's the one thing not to drift from during the rebuild. Volt-amber stays the accent for anything charging/power-related, and **additional supporting colors are allowed** where a screen genuinely needs a third signal (e.g. `signal-red-500` for a rejected/error state, per §2's shared status convention) — but green-on-white is the identity a person should recognize the kiosk by from across a room, not one accent color among several competing for attention.

**Animated background — decided 2026-08-11, superseding the Aurora direction below.** The user explicitly asked for a different treatment — "a different Animated Background maybe falling leaves etc" — after the Aurora candidates had been researched but never actually implemented (Phase E2 hadn't reached this item yet, so nothing shipped that needs undoing). **Falling leaves is now the committed direction for the Kiosk idle/attract screen**, and — since §6 explicitly reasoned that the Website should reuse whatever the Kiosk uses "for consistency" — the Website hero (§6) follows suit rather than keeping the now-superseded Aurora reasoning; flag to the user if that inference turns out to be wrong. Real options researched 2026-08-11, no dedicated maintained "falling leaves" npm package exists (checked directly), so the choice is between two legitimate implementation strategies:

- **Vendored CSS/SVG leaf-fall component (recommended, primary)** — same treatment already given to `Stianlars1/react-gradient-animation` above: real, working patterns to adapt and own, not an opaque dependency. Multiple independent working reference implementations confirmed: [CSS falling leaves](https://codepen.io/uurrnn/pen/WNLVdN), [Falling Leaves Animation with CSS only](https://codepen.io/maiptn226/pen/Zvvdbq), [Falling Leaves](https://codepen.io/smhigley/pen/gwYPvR), [October Falling Leaves CSS Animation](https://codepen.io/incrediblecast/pen/yLBmVXQ), [CSS 3D Falling Leaves With Realistic Shadows](https://codepen.io/dudleystorey/pen/kKBOmV). Pattern: a handful of leaf SVG shapes (2–3 distinct silhouettes to avoid visible repetition), recolored via `fill`/`filter` to eco-green/volt-amber/bloom-violet rather than literal autumn orange-brown (this is a recycling product, not a fall-themed one — the leaf *motif* is the point, not a seasonal palette), animated with staggered CSS `@keyframes` (fall + horizontal sway + rotation, randomized delay/duration per leaf via inline custom properties). No WebGL, no canvas, no particle-engine JS — meaningfully lighter than the Aurora/`ogl` option this replaces, which matters on kiosk-class hardware.
- **[tsParticles](https://github.com/tsparticles/tsparticles) with [`tsparticles-shape-image`](https://www.npmjs.com/package/tsparticles-shape-image) via [`@tsparticles/react`](https://github.com/tsparticles/react)** — a real, actively-maintained, official React-wrapped particle engine (unlike a hand-copied CodePen, this is a genuine dependency with docs and semver) that supports arbitrary image shapes as particles with built-in gravity/wobble physics — a leaf PNG/SVG as the particle image gives a more physically organic drift than hand-tuned CSS keyframes for less handwritten animation-curve work. Canvas-based, not WebGL, so it doesn't carry Aurora's WebGL-context-creation risk on constrained kiosk hardware either. Reasonable fallback choice if the vendored CSS approach ends up looking too uniform/repetitive in practice.

**Aurora direction, superseded — kept here for history, not re-proposed:** the four candidates previously listed (`react-bits Aurora`, `shadcn.io Aurora Background`, `Aceternity UI Aurora Background`, `Stianlars1/react-gradient-animation`) are no longer the plan for the Kiosk or the Website hero. `react-gradient-animation` is left linked above only because its "vendor real code, don't take an opaque dependency" *treatment* still applies to the new choice, not because the gradient aesthetic itself carries forward.

Same hard constraints as any animated background used elsewhere in this project, unchanged by the direction swap: never behind body copy/tabular data at full strength, `prefers-reduced-motion` freezes it to a static first frame (a still scatter of a few leaves, not a blank rectangle), and it must degrade gracefully if canvas/JS fails to init — relevant here specifically because kiosk hardware is exactly the kind of constrained environment where that can happen.

**Template references — real, found 2026-08-10, use as supporting structure alongside the real designs below, not a replacement for them:**
- **[Reverse Vending Machine](https://www.figma.com/community/file/1358993306195421470/reverse-vending-machine)** (Figma Community) — closest direct domain match.
- **[Self Service Kiosk](https://www.figma.com/community/file/1475972798185896799/self-service-kiosk)** (Figma Community) — general self-service touchscreen patterns, already referenced in §6 below.
- **[Vending Machine Kiosk](https://www.figma.com/community/file/1400020290371430370/vending-machine-kiosk)** (Figma Community) — rewards-points/coupon flow, structurally close to the credits concept here.
- **[Recycling App | UI Design](https://www.figma.com/community/file/1165246885611208493/recycling-app-ui-design)** (Figma Community) — for the eco/recycling visual language specifically, cross-pollinate with the Mobile App surface (§5) too, since both share the same identity.

**Tooling note for future Figma iteration:** if the real Figma file gets revisited, the **[Figma Specs plugin](https://www.figma.com/community/plugin/1604491843373484782/specs-prompt-for-design-to-code-for-claude-code-codex)** converts a selected frame directly into structured YAML built for AI coding agents, plus a visual spec frame for human review — a tighter round-trip than exporting to a flat PDF and re-deriving specs by eye the way this section had to. Worth adopting if more design iteration happens in Figma itself.

### 4.6 The real premade designs — reviewed 2026-08-10, `EcoCharge.pdf` (80 pages, dropped at repo root)

> **SCOPE REDUCED 2026-08-11, explicit user instruction: "Only use the PDF for the Character mascot as stated."** This section stays as a written record of what the deck contains, but **the deck is no longer the layout authority for the Kiosk** — only the mascot art is taken from it. Structure, composition, and page layout now come from independently researched external references (`docs/design/README.md` lists them per surface, with links). The reason is the same one already applied to §3 and §6: a single premade deck driving every screen makes the product a re-skin of that deck rather than its own thing. The component *inventory* below is still a useful checklist of what a kiosk of this kind needs; treat it as that, not as a layout spec.
>
> **Real correction to this section's own measurement, 2026-08-11:** it claims the deck is "1080×1920 portrait, confirmed from the PDF's own page geometry." Measured directly with PyMuPDF: 75 of 80 pages are 1080×1920, but pages 1, 13, 14 and 15 (the mascot attract screens) are **2732×1920 landscape**, and page 46 is 1080×1931. The portrait figure is right for the flow screens and wrong for the attract screens.
>
> **This mismatch had a real cost.** `KioskRoot.tsx` capped the whole kiosk shell at `maxWidth: 600` with a comment about "a 15.6-inch landscape touchscreen" — so every kiosk screen rendered as a narrow column inside two dead bands, on hardware that is actually 1080 wide. Found on a screenshot 2026-08-11 and fixed.

**No longer blocking — read and catalogued in full below.** The templates in §4.5 remain useful for screens the deck doesn't cover (see the gap list at the end of this section).

**Read this in full before writing any kiosk UI code.** The deck is a Figma export at true kiosk resolution (1080×1920 portrait, confirmed from the PDF's own page geometry) showing the same set of roughly 15–18 unique screens repeated across several mock accounts and one language toggle — not 80 distinct screens. What follows is the real, observed design language, not a restatement of the generic tokens earlier in this document; **where this section and §2's shared token table disagree, this section wins for the Kiosk specifically** — update `DESIGN.md` to match, don't quietly average the two.

**Palette — corrected against real screens, not eyeballed as final hex:**

| Role | What's actually in the deck | Notes |
|---|---|---|
| Primary | Deep forest green (solid full-bleed hero panels, primary buttons, header wave) | Closer to `#127A3B`/`#0F7A3D` than the previously-specified `eco-green-500 #16A34A` — deeper, less saturated. **Estimated from a rendered PDF, not sampled from the source file** — get the exact value from the Figma file/PDF's own color picker before locking a final hex, don't treat this as authoritative. |
| Secondary (ghost/ ínactive) | Muted sage/olive green | Used for secondary pill buttons ("Guest") and one category tile ("View Credit") — a genuinely distinct token from primary, not just primary-at-lower-opacity. |
| **Tertiary — a real, confirmed accent this document didn't previously have: purple** | A solid violet/purple (~`#9B6FE0` range, estimated) | Appears deliberately and repeatedly — "Show More," "Add To Credit" — never as a gradient (so it doesn't trip §1's banned-gradient rule), always a solid pill. **Add this as a real fourth token** (e.g. `bloom-violet-500`) rather than treating it as a one-off; it reads as "secondary call-to-action distinct from the primary green CTA," a real, useful third semantic role. |
| Bin-level gauge (5 states, a real component) | Green (empty) → brighter green (~20%) → dark ochre/amber (~50–70%) → red (100%/critical) | The "battery" gauge shape (see below) recolors by fill level — this is closer to the shared status convention (`§2`) than a separate scale, but the actual amber shown is a duller, browner ochre than `volt-amber-400 #FBBF24` — sample the real value rather than assuming the existing token matches. |
| Status/feedback badge | Green circular "halo" badge for **both** success and failure, differentiated only by icon (✓ vs ✕), not by color | **A real gap worth deciding explicitly, not silently copying**: using green for a failure state conflicts with §2's shared red-for-critical convention used everywhere else in the product (admin console, bin gauge). Recommend keeping the icon-differentiated badge shape (it's a nice, calm pattern) but switching the failure variant to `signal-red-500` to stay consistent with the rest of the system — flag this as a deliberate, reasoned deviation from the source file if it comes up, not an oversight. |

**Typography — corrected, this document previously specified Outfit/IBM Plex Sans speculatively; the real deck uses neither:**
- **Display/headings/buttons/logotype**: a bold, rounded, geometric sans with soft terminals — visually closest to **Baloo 2, Fredoka, Quicksand (Bold/SemiBold), or Comfortaa** (all real, free Google Fonts families in this general shape). Pick one of these four and commit — don't mix them. This replaces the earlier Outfit recommendation, which reads more neutral/geometric-technical than the warm, rounded character actually shown.
- **Body**: a plain humanist sans (default-weight, unremarkable — consistent with something like Nunito Sans or the system default at regular weight). Lower-stakes choice than the display face; match whatever the chosen display family's designer intended as its body pairing if it ships one (Fredoka and Quicksand both have reasonable body-weight settings).
- **One deliberate serif flourish**: the personalized profile/ID-card screen sets the user's first name ("Taylor") in a serif display face, contrasting with the rounded sans everywhere else. Treat as a one-off personalization accent, not a third systemic typeface — don't spread it elsewhere.
- **Numerals (credit countdown, e.g. "00:01:00 min")**: rendered as bold tabular figures **within the main display typeface**, not switched to a separate mono family — this is a real, useful correction to this document's earlier "IBM Plex Mono for numbers" guidance (written for the Admin Console's dense telemetry, not the Kiosk's friendlier register). Use the chosen display font's tabular/lining figure variant if it has one; don't import a second numeral typeface just for this.

**Shape language — a real, consistent signature, not yet captured anywhere in this document:**
- **Everything is heavily rounded**: fully pill-shaped buttons and inputs (not just a modest radius), ~24–32px radius on cards/panels. This is the opposite end of the radius spectrum from the Admin Console's "Operations Console" direction (§3) — that's fine, they're deliberately different problems, don't let one surface's radius scale bleed into the other's `DESIGN.md` tokens.
- **A signature wave/blob curve divider** — a organic curved SVG shape cutting across the top of a color block (used on the login/register form and the profile/ID card), separating a solid-color header region from a white body region. This is a real, repeated brand motif, not a one-off decoration — build it as a genuine reusable component (an SVG path or a CSS `clip-path`, whichever renders more crisply at the kiosk's fixed 1080×1920 resolution), not redrawn ad hoc per screen.
- **Mixed-fidelity imagery, deliberately**: real product photography (actual bottle photos, a phone-charging-dock stock photo) sits alongside flat vector icons (wall outlet, battery gauge, receipt) in the same screens. Keep both registers rather than forcing everything to one illustration style — the photography sells "this is a real bottle/real charger," the icons keep the UI legible and fast to scan.

**Real components catalogued from the deck — build these, don't re-invent equivalents:**
- **Header bar**: leaf-and-lightning-bolt logomark + "EcoCharge" wordmark (left), account avatar + name/"Guest" label (right, circular).
- **Bin-level "battery" gauge**: a vertical battery-outline shape with a fill level and a % + status line, recoloring across the 5 states in the palette table above. Real component, appears identically across every account variant.
- **Category tile grid**: 2-up grid, "Plastic Bottle" (recycle icon) / "View Credit" (charging icon), solid-color tiles in primary/secondary green.
- **Charging-station picker grid**: a grid of numbered "Station N" tiles (wall-socket icon + a "+" select button per tile — green when selectable, and **a distinct "occupied/unavailable" state exists**: at least one variant shows a station's "+" rendered in dark red instead of green), with a persistent bottom confirm bar (`Back` | `You Selected: Station N` | `Confirm`).
- **On-screen numeric keypad**: a real 0–9 + backspace touch keypad built into the phone-number login field — necessary since the kiosk has no physical keyboard. Don't rely on the OS's own on-screen keyboard; this is a custom, larger-target component matching the rest of the UI.
- **OTP verification**: a bottom-sheet-style modal (drag-handle indicator, rounded top corners rising from a solid green base) with 4 individual digit boxes and a "Continue" button — the phone-verification step of registration.
- **Success/failure feedback badge**: the circular halo-ring badge described in the palette table, paired with a bold headline ("Register Successful"/"Register Unsuccessful") and a single pill CTA below (`Try again` outlined, or none needed on success).
- **Receipt/done screen**: solid green full-bleed background, a checkmark badge, an illustrated paper-receipt graphic, session summary text, and a white "Thank You" pill CTA.
- **Credit/mode-select screen**: "Select your Preference" — Charge vs. Credit, each a large photo-illustrated tile, plus a bold two-tone "RECYCLE NOW" wordmark treatment on at least one variant (green + the tertiary purple) — a real, deck-confirmed instance of the shape/typography style applied at hero scale, useful as a reference for the idle/attract screen's own hero moment.

**Real requirement found in the deck, not previously in this document: a language switcher.** At least one login variant shows an "Eng ⌄" pill control top-right. Add multi-language support to scope — check with the user which languages beyond English before building (Bisaya/Cebuano is the obvious local candidate given the UC Lapu-Lapu/Mandaue deployment context, but don't assume — ask).

**Animation guidance for these specific real components** (this document's general animation rules already apply; these are the concrete, per-component applications "add animations" asked for):
- **The success/failure halo badge** is practically built for a pulse: animate the concentric rings scaling outward with fading opacity on entrance (a single ease-out pulse, not a looping one — it's a one-time confirmation, not an idle-loop element), landing on the static ✓/✕ icon.
- **The wave/blob divider** can carry a very subtle idle drift (a slow, low-amplitude path morph) on the idle/attract screen specifically — freeze it to static on interactive screens (login, profile) where motion behind form fields would hurt legibility, per §1's shared "never behind body copy at full strength" rule.
- **The bin-level gauge** should animate its fill level transitioning between states (a smooth height/color tween) rather than snapping, whenever live telemetry updates it — this is a real-data-driven element, not decorative, so keep the animation quick (under ~400ms) and don't let it imply a fake sense of gradual filling when the real change is a discrete telemetry update.
- **Category tiles and station-grid tiles**: a small scale/press feedback on touch (already implied by kiosk-industry touch-target conventions elsewhere in this document), plus a staggered entrance when the grid first renders.
- **The numeric keypad and OTP boxes**: per-digit entry should give immediate, obvious visual feedback (a brief scale/color pulse per keypress) — kiosk touch input has no tactile confirmation the way a physical keyboard does, so the UI has to supply it.

**Real, unresolved issue found in the deck — flag clearly, don't ship silently:** several of the mascot/character illustrations in the deck (the idle/attract "Touch to Proceed" screens, the login-screen avatar) are anime-style fan art of existing licensed characters — one image carries an explicit **"© Genshin Impact"** credit visible in the file itself, and at least two others are stylistically consistent with the same source (miHoYo/HoYoverse's Genshin Impact character designs, redrawn in a chibi style). **This cannot ship as-is in a real public-facing product** — a thesis defense, a public GitHub repo, and a public kiosk display are all contexts where using someone else's copyrighted character art without a license is a real problem, not a style nitpick. Recommended path: treat these images as **mood/style reference only** — "a cute, chibi-proportioned nature spirit with a flower crown, green color story, holding a bottle" is a legitimate creative direction to carry forward — and either commission original character art in that spirit, or generate a demonstrably original character (different proportions, palette details, accessories) rather than a close copy. Don't silently swap in a different piece of fan art either; the underlying problem is the same regardless of which existing IP it's drawn from. This is now tracked as its own open item in `memory.md` and `docs/CHECKLIST.md` — resolve before any mascot-bearing screen ships anywhere public.

**Gaps — real screens this deck does not cover, still need original design work in the now-established language above:** the AI-scanning/camera capture screen (§4's "do not leave yet" `SCANNING` state), an explicit bottle-reject-with-reason screen, and the bin-full cutoff screen (§4.4). Design these following the palette/typography/shape language documented above, not as a stylistic departure — they're the same product, just states the deck's account/login-focused export didn't happen to include.

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

**Real risk found and corrected 2026-08-11: this section originally pointed at Velora UI as "the same template EngiRent used" — a sibling thesis project's own public site.** Both projects being built by the same person on the same shared machine made that an easy default to reach for, but it means a full Velora-UI adoption here would risk EcoCharge's public site reading as a re-skin of EngiRent's, not a distinct product — a real problem for two theses meant to stand on their own. **Not dropping shadcn/ui as the technical base** (it still gives Kiosk Web and the Website a shared primitive layer, a real, independent reason unrelated to EngiRent), but the *page-layout and structural* reference now comes from different real sources, and Velora's specific hero/page compositions should not be reused verbatim:

- **[shadcn-ui/taxonomy](https://github.com/shadcn-ui/taxonomy)** (also live at [tx.shadcn.com](https://tx.shadcn.com/)) — the canonical shadcn/ui full-stack reference (19k+ stars), MIT-licensed, Next.js + Tailwind, real blog/docs/auth/billing structure via Contentlayer + MDX. Archived (no longer updated) but that's irrelevant here — it's being read as a structural/pattern reference to adapt, not run as a live dependency, the same "vendor and own the code" treatment already given to other real-but-unmaintained sources in this document.
- **OpenStacked** (Next.js 14 + Tailwind + shadcn/ui, multi-page: Home, Docs, Community, Changelog, About) — the closest direct page-set match to what EcoCharge's site actually needs (home/docs/changelog/about + a download page); license unconfirmed at a glance, so treat as **structural/layout inspiration only**, not a literal template to clone — don't take code from it without checking its actual license first.
- **Aurora hero background**: no longer relevant here either way — §4.5 replaced Aurora with falling leaves for the Kiosk, and per that section's reasoning the Website hero follows suit for cross-surface consistency, not Velora's aurora.

**The real deliverable:** build the Website's own page compositions using shadcn/ui primitives directly, informed by Taxonomy's real docs/blog structure and OpenStacked's real page inventory, recolored and re-laid-out for EcoCharge's green/white "Clean Energy Reward" identity with the falling-leaves hero — not any single template's page-for-page layout. Genuinely different hero composition, nav structure, and section ordering from whatever EngiRent's own public site does; don't cross-check against EngiRent's site for "what looks right" while building this.

**Tooling note, same exception already established for a comparable surface elsewhere:** shadcn/ui's stack is a deliberate departure from HeroUI (used by `client/kiosk_web`/`client/web_console`) — acceptable here specifically because this surface shares no components and no user session with the other three; don't try to reconcile the two component systems.

**Pages to build, using Velora UI's real page set as the starting skeleton:**
- **Home** — hero (aurora background, re-themed), the real EcoCharge lifecycle (bottle → AI grading → credits → charging), a "how it works" walkthrough, footer.
- **Changelog** — real, dated entries sourced from what actually shipped (git history / `memory.md`'s decision log are the honest source — never invented to make a release look more substantial than it was, same rule as `06-must-have-app-features.md` §4).
- **Docs** — public-facing product documentation (how the kiosk works, how credits/charging work, FAQ) — **not** a mirror of `docs/planning/`, which is internal/contributor-facing.
- **Download** — the mobile app. **No evidence this app is published to any app store** (checked: `analyzation.md`/`docs/PROJECT_ANALYSIS.md` never mention one) — build this as a direct APK download page (Velora UI's own `/docs`-adjacent download-flow pattern, or a simple dedicated route) rather than linking a store listing that doesn't exist. If a real store listing ever does get published, repoint this page then — don't build toward an assumed listing now.
- **About** — thesis/academic context, matching this being a real academic project.

**Palette:** same "Clean Energy Reward" identity as the Kiosk and Mobile App — green + white base, volt-amber accent — **not** the Admin Console's dark "Operations Console" palette, which is a deliberately separate problem (an internal ops tool, not a public-facing surface).

**Hosting:** public, via the Cloudflare Tunnel set up in `03-revamp-master.md` §1.1 — this is exactly the kind of service that tunnel exists for. Route it on its own subdomain (or the bare `ecocharge.dpdns.org` root, with the API/kiosk on their own subdomains) — decide the exact hostname split when the tunnel's Public Hostnames are actually configured, not before.

---

## 7. Existing foundation — what carries forward, what doesn't (revised 2026-08-10)

**Superseded by the "Component library" decision near the top of this document: `hero.ts` and the `@heroui/*` packages are being deleted, not kept as a bridge.** The paragraph that used to be here said the opposite — read that as this document's own history, not current guidance.

**What does carry forward, because it's not HeroUI-specific:** both web apps' Tailwind v4 `@theme` color tokens in `styles/globals.css` (`--green-*`/`--color-eco-*`) are plain CSS custom properties, not HeroUI theme config — they survive the HeroUI removal untouched and become the real source for this document's semantic tokens (`eco-green-*`, `volt-amber-*`, and the newly-confirmed `bloom-violet-*` purple accent from §4.6). **Correction to this document's own earlier instruction**: an earlier pass here said to delete `--color-eco-dusk`/`--color-eco-lavender` (purple) as banned-pattern violations — that was wrong. §4.6's real design reference confirms purple is a deliberate, real accent color in this product. Don't delete those tokens; rename/consolidate them into the new `bloom-violet-*` naming if it's cleaner, but the hue itself stays.

**Mechanically, per surface:**
- **Admin Console**: remove `@heroui/*` from `package.json`, remove the `HeroUIProvider` wrapper, install Mantine's provider in its place. Every HeroUI component instance (buttons, tables, modals, etc.) gets rebuilt against Mantine, not wrapped/adapted — this is the "delete and redo" the user asked for, not a compatibility shim.
- **Kiosk Web**: same removal, replaced with shadcn/ui components installed via its CLI (which vendors real component source into the repo, not an opaque dependency — consistent with how this document already treats react-bits/Velora UI elsewhere) on top of Radix UI or Base UI primitives.
- Neither app's underlying Tailwind setup needs to change — both libraries work with Tailwind v4 natively.

---

## 8. Sequencing

Component inventory (Knip sweep, nav catalog) is done — confirmed clean, no consolidation needed before starting on the three existing surfaces (it obviously doesn't apply to the new Surface 4, which has no existing components to inventory). Do the visual rebuild in this order: Admin Console first (dense, highest-value telemetry surface, and the one furthest from done), then Kiosk Web (needs the idle-timeout and step-wizard built from scratch, not just restyled — and is blocked on the Figma-designs and mascot questions in §4.5 for anything beyond structural/functional work), then the Mobile App, then the new Public Website (§6) — it's independent of the other three and could in principle move earlier if the Figma/mascot blockers on the Kiosk drag on, but is placed last here since it has no existing user-facing gap the way the other three do. Update `DESIGN.md`'s execution-status checklist and `memory.md` as each surface actually ships, with screenshots — not before.
