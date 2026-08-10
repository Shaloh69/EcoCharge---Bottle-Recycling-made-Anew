# EcoCharge — Public Website

The public-facing marketing/promotional site: what EcoCharge is, how it works, a real changelog, public docs, and the app download page. New surface, added 2026-08-10 — see `docs/planning/02-design-mandate.md` §6 for the full spec this was built against.

## Stack

Next.js 15 (App Router, matching `client/kiosk_web`/`client/web_console`'s version — deliberately not the Next.js 16 the scaffold tool defaults to, to avoid an unnecessary framework-version split across three sibling apps), Tailwind CSS v4, shadcn/ui foundation (`components.json`/`lib/utils.ts`, no components installed yet), Framer Motion.

Same "Clean Energy Reward" identity as `client/kiosk_web` and `client/flutter_app` — Baloo 2 display font, IBM Plex Sans body, eco-green primary. Not the Admin Console's separate "Operations Console" stack.

## Running

```bash
npm install
npm run dev
```

## Status

Scaffolded 2026-08-10: real pages (home with aurora hero, how-it-works, changelog with real dated entries, docs, about, download), not placeholder content. **Not yet done**: the `/download` page's APK link is a placeholder (no build pipeline wired up yet), and the pricing/blog pages the design mandate mentions as optional weren't built (no real content to populate them with yet — per the mandate's own rule not to ship an empty blog).
