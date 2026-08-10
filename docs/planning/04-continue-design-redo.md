# EcoCharge — Continuation Prompt: Resuming the Design Revamp

Paste this in once the plumbing work (`03-revamp-master.md` §1–§3: self-hosting migration, key rotation + firmware fixes, the `ml-review` decision) is settled and it's time to actually execute the visual rebuild. This file's scope is narrower than `00-start-here.md` on purpose — it exists specifically for picking the design work back up correctly, since that's the piece most likely to get started, paused, and resumed by a different session than the one that began it.

---

**Status, for context, verified against code — not claimed by an earlier doc:** the design *system* is fully specified (`02-design-mandate.md` is the mandate, `DESIGN.md` is the as-built tracker) and the groundwork is done — tokens defined, `design-review` agent + `avoid-ai-design` skill installed, component inventory clean on all three surfaces (Knip-verified, no duplicate nav components). **None of the three surfaces have been visually rebuilt yet.** Confirmed by grep, 2026-08-10: neither Next.js app has Space Grotesk/Outfit/IBM Plex wired in (still whatever the HeroUI template defaults left behind), the kiosk has no `react-step-wizard`, and the Flutter app's `pubspec.yaml` has none of `skeletonizer`/`lottie`/`rive`/`flutter_animate`. This is the actual starting line — don't assume partial progress exists anywhere just because the tokens and tooling do.

**Read `02-design-mandate.md` in full before generating anything.** Two things worth flagging up front, both already noted there:

1. **The spacing/radius scale is not yet locked.** Unlike the color/typography tokens (which are fully specified), `DESIGN.md` doesn't currently define an explicit spacing grid or a radius cap. Both Next.js apps already carry a customized `hero.ts` HeroUI theme — check what that theme already commits to for radius/spacing before inventing a new scale from scratch. If it turns out inconsistent or unset, that's a real question for the user before locking in new component styles across three surfaces, not something to guess at silently and hope it reads as intentional later.
2. **§0's verification loop is hardened for a reason worth internalizing, even though nothing has shipped here yet to fail it.** A sibling project on this same methodology shipped a "verified" design pass where the deliverable doc claimed a component was built and screenshot-checked, and a later live screenshot of the actually-deployed instance showed the component missing entirely and text failing contrast — the verification loop that was supposed to catch that hadn't actually been checking the things it claimed to check. Nothing analogous has happened on EcoCharge yet, precisely because nothing has been marked done without evidence so far — keep it that way. Don't check an item off in `DESIGN.md` without a real screenshot of the real running instance backing it up, and don't accept "looks styled" as a substitute for the explicit contrast/palette/component-presence checklist in `02-design-mandate.md` §0.

## Work order for this session

1. **Admin Console first** (`client/web_console`) — dense, highest-value telemetry surface, and the one furthest from any existing custom styling beyond the token layer. Full delete-and-rebuild per the mandate, not an incremental restyle.
2. **Kiosk Web second** (`client/kiosk_web`) — needs the idle-timeout built from scratch (none exists today — this isn't a bug fix, it's new, FSM-aware infrastructure) and the step-wizard flow, not just a restyle of the current pages.
3. **Mobile App third** (`client/flutter_app`) — theme rework plus the five-library animation stack addition, then a screen-by-screen pass using the current real screen list in `analyzation.md` §13 as the floor.
4. **After each surface**, not at the end of all three: run `/design-review`, run the `avoid-ai-design` banned-pattern audit, take the real screenshots, update `DESIGN.md`'s execution-status checklist and before/after section, and record anything non-obvious in `memory.md`.

Load the `dataviz` skill before touching the Admin Console's analytics charts specifically — this repo's own tooling convention, not optional, already noted in the mandate.

## Stop conditions

Same as `00-start-here.md`: don't guess on anything that isn't specified in `02-design-mandate.md` (the spacing/radius gap above is the known one; if another genuine gap surfaces mid-build, flag it the same way rather than inventing a value and moving on). Everything else in the mandate is final — proceed without re-confirming decisions that are already written down there.
