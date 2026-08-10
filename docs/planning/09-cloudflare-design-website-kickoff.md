# EcoCharge — Kickoff: tunnel consistency, real design pass, app-management website

**Superseded, 2026-08-11: this is the kickoff prompt that started the session recorded in `memory.md`'s "4th session" entries — `docs/planning/00-start-here.md` is the current, kept-up-to-date entry point going forward, not this file.** Kept for the record of what was originally asked (the "work three things" list below is what that session and its successor worked from); its own claims are a snapshot from before that work started; e.g. the admin-console-tunnel question it poses as open below was resolved (made public) in the session immediately before this file was written. Don't treat anything below as current status — check `00-start-here.md` and `08-master-checklist.md` instead.

Paste this into a fresh Claude Code session at the EcoCharge repo root.

---

Read `docs/planning/00-start-here.md` first, in full, then `memory.md` and `docs/planning/08-master-checklist.md` for the detail behind it. Confirm Playwright MCP is actually available in this session before doing any design work — check your own tool list, don't assume the earlier installation took effect just because it was registered; a session that started before that registration won't see it.

**This is a full revamp and redo of the entire documentation set, not just the three work items below.** `docs/planning/08-master-checklist.md` already exists specifically because an earlier self-audit found docs (`DESIGN.md`) claiming things were done that a real check showed weren't — that's not a one-time cleanup, it's a pattern to actively guard against for the rest of this project, not something that got fixed once and is now safe to stop watching for. As part of this session, go through every document under `docs/` (planning docs 00–09, `DESIGN.md`, `AUDIT.md`, `analyzation.md`, `docs/CHECKLIST.md`, `docs/PROJECT_PLAN.md`, `docs/PROJECT_ANALYSIS.md`, the root `README.md`) and check each claim against the real, current state of the code and the live deployed instance — not against what an earlier doc says. Correct anything stale, rename/renumber/merge/retire anything that's drifted, redundant, or contradicts a later decision. Don't limit this pass to the three technical work items below; the technical work and the documentation audit happen together, in the same session, informing each other.

**Update `memory.md` and `docs/planning/08-master-checklist.md` continuously, as you actually learn or find things — not as a summary written at the end.** Every real finding (a bug, a stale claim corrected, a decision made, a port conflict avoided, a copyright issue caught) gets its own dated entry the moment it's found, the same discipline `memory.md` already models in its existing entries (what happened / why it matters / how to apply). A future session — or you, later in this same one — should be able to read `memory.md` top to bottom and reconstruct exactly what happened and why, without having to reverse-engineer it from a diff. If something turns out to already be accurately documented, that's worth a quick confirming note too (so the next pass doesn't re-check it from scratch), not just silence.

**Shared hosting machine — read before touching any port, container, or scheduled task.** EcoCharge and EngiRent are both hosted on the same physical machine, `desktop-gklhcri`. This isn't a coincidence to work around, it's the standing setup — but it means every new service needs a port/resource that's actually free on that machine, checked directly, not assumed. Known-taken, from the EngiRent side:

| Resource | Port/detail | Project |
|---|---|---|
| MySQL (pre-existing local Windows service) | 3306 | Neither — leave untouched, credentials unknown to either project |
| MySQL (Docker, `engirent-mysql`) | 3307 | EngiRent |
| MySQL (Docker) | 13306 | EcoCharge |
| Node API | 5000 | EngiRent |
| Node API | 30010 | EcoCharge |
| Admin Console | 3001 | EngiRent |
| Admin Console | 30011 | EcoCharge |
| Public site / promo website | 3000 | EngiRent |
| AI server | 30012 | EcoCharge |
| Phone App web (Flutter, `python -m http.server`) | 8092 | EngiRent |

EcoCharge's Kiosk Web and public Website aren't deployed to this machine yet — when they are, pick free ports (continuing EcoCharge's own `3001x` numbering is the obvious move: `30013`, `30014`, ...) and verify with `netstat`/`Get-NetTCPConnection` on the actual machine before binding, not by assuming the list above is exhaustive — other sibling thesis projects may land on this same machine too over time. Scheduled Task names should stay prefixed `EcoCharge*` (already the convention) so they're never ambiguous with EngiRent's own tasks in Task Scheduler's flat list.

**Also a real, already-experienced risk on this machine, not theoretical**: training or any other CPU/IO-heavy EcoCharge job has already stalled once from resource contention with a concurrent large Docker pull on this same box (see `memory.md`, the Supabase-pull/training-stall incident). The same risk now applies *across* projects, not just within EcoCharge — if EngiRent is mid-deploy or mid-rebuild on this machine, avoid kicking off something equally heavy at the same time if it's avoidable to sequence instead.

---

Work three things, in this order:

## 1. Cloudflare tunnel consistency check

API and the AI server are already on real, verified Cloudflare quick tunnels. Kiosk Web and the public Website aren't deployed publicly yet at all. The admin console is currently Tailscale-only by deliberate earlier decision, not an oversight — before changing that, ask explicitly whether it should move to a quick tunnel too or stay private; don't assume "all" means moving it without confirming. Once Kiosk Web and the Website actually get deployed (see §1's port table above for which ports are free), put them on quick tunnels consistent with the API/AI server, and confirm each one is reachable from the public internet (`curl` from outside the tailnet), not just locally.

## 2. Real design-check pass against the actual reference templates

Work `docs/planning/02-design-mandate.md`'s four surfaces in the order it specifies (Admin Console, then Kiosk Web, then Mobile App, then the Website) using the real templates it names, not a generic look:

- **Admin Console**: Mantine. The last pass found real glassmorphism and banned decorative gradients on every route, worst on login, never actually touched by the earlier rebuild — fix that for real this time, screenshot-verified in both color schemes against the live instance.
- **Kiosk Web**: shadcn/ui on Radix or Base UI primitives, built against the real client Figma deck (§4.6), not the generic Figma Community references, which only fill gaps the real deck doesn't cover. The deck has an unresolved problem you must not ship past: several mascot/character illustrations are Genshin Impact fan art with a visible copyright credit. Do not use that art or a close copy of it — follow the mandate's own recommendation (treat it as mood/style reference only: chibi nature-spirit, flower crown, green palette) and use an originally generated or commissioned character instead. Flag this explicitly if you're about to build any mascot-bearing screen.
- **Mobile App**: screen-by-screen pass wiring the animation stack that's already installed. If the Flutter SDK isn't available in this environment, say so explicitly and describe exactly what needs manual verification rather than claiming it's done.
- **Website**: Velora UI, same template EngiRent used — adapt structure, don't copy content.

Every surface gets real screenshots against the live deployed instance before being marked done — both color schemes where dark mode applies, light-only for the Kiosk. A clean build is not verification.

## 3. Bring the public website's app-distribution pages up to the same standard EngiRent's has

EngiRent's public site has three things worth mirroring here: a real fetch-progress download page (not a bare file link — actual byte progress, a thank-you screen with real disclaimers once it completes), a real dated changelog page sourced from `memory.md`'s actual entries (never invented copy), and a hard-block "update required" screen for outdated installs that shows real release highlights and credits whichever user reported a bug that's fixed in that release. Check first whether EcoCharge has a real, buildable mobile app release yet — if not, build the pages/infrastructure now (the changelog can start populating from real `memory.md` history immediately) and wire the download flow to a real APK the first time one actually gets cut, rather than faking a build that doesn't exist.

---

Don't stop for review between unblocked steps within these three. Do stop at anything that's a real product decision (the admin-console tunnel question above, or anything else you find that fits that category) or that needs physical hardware access. Update `memory.md` and `08-master-checklist.md` as real work lands, same evidence bar as always — a screenshot for anything visual, a live curl/response for anything about reachability. Commit as you go; ask before pushing.

Give one consolidated summary at the end.
