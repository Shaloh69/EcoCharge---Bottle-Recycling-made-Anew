# EcoCharge — Design Evidence & Reference Comparison

Started 2026-08-11, during the full-redo pass. This folder holds the real
screenshots behind every design claim made in
`docs/planning/08-master-checklist.md` Phase E, plus the reference material each
surface was actually built against.

`docs/planning/02-design-mandate.md` §0 requires a screenshot of a real running
instance before any design item is marked done. This folder is where those
screenshots live, so "verified" is checkable rather than asserted.

---

## Where the references come from — corrected 2026-08-11

**The reference deck (`EcoCharge.pdf`, 80 pages) is now used for the mascot
only.** This is a direct user instruction and it supersedes §4.6 of the design
mandate, which had catalogued the deck as the primary layout authority for the
Kiosk. Layout and structure now come from independently researched external
references (below), so the product does not inherit a single deck's page-for-page
composition.

What was kept from the deck: `reference/mascot-attract-p*.png` — the four
landscape attract-screen pages carrying the mascot art. Attribution is real and
unchanged (`client/kiosk_web/public/mascot/CREDITS.md`).

**A real correction to the mandate found while extracting these:** §4.6 states
the deck is "1080×1920 portrait, confirmed from the PDF's own page geometry."
That is true of 75 of the 80 pages. Pages 1, 13, 14 and 15 — the mascot attract
screens — are **2732×1920 landscape**, and page 46 is 1080×1931. Measured
directly with PyMuPDF, not eyeballed.

### Researched layout references, per surface

| Surface | Direction committed to | Sourced from |
|---|---|---|
| Admin Console | Split-screen sign-in; brand panel replaced by a live status board | 2026 split-screen admin-login pattern ([AdminLTE roundup](https://adminlte.io/blog/dashboard-templates/), [Eleken login-page study](https://www.eleken.co/blog-posts/login-page-examples)) |
| Kiosk Web | Full-bleed portrait bands, 3–5 step task, oversized targets, back always visible | [Kiosk UX/UI checklist](https://kioskindustry.org/kiosk-ux-ui-how-to-design-checklist/), [Frank Mayer kiosk UI](https://www.frankmayer.com/blog/user-interface-design-for-kiosks/), [Ikinor kiosk UI guide](https://ikinor-interactive.com/kiosk-ui-design-guide/) |
| Mobile App | Wallet-app pattern: hero balance, transaction list | [Mobbin wallet-balance screens](https://mobbin.com/explore/mobile/screens/wallet-balance) |
| Website | shadcn/ui primitives, own page compositions | `shadcn-ui/taxonomy`, OpenStacked (already in §6) |

---

## Screenshots

All taken against a real running instance at the surface's real resolution —
the Kiosk at **1080×1920**, its actual hardware geometry.

### Admin Console (`screenshots/admin/`)

| File | What it shows |
|---|---|
| `00-login-BEFORE-generic-card.png` | The centred logo-over-two-fields card. This is the layout §2 bans outright, and it is what prompted the redo. |
| `01-login-split-screen.png` | Rebuilt. Left rail probes the real `/health` — captured showing `OPERATIONAL`, `139 ms`, real server time. |
| `00-dashboard-BEFORE.png` | Emoji icons in rounded-square chips (§1 banned), four competing border hues, `0 kiosks online` rendered **green**. |
| `02-dashboard.png` | Rebuilt. Lucide icons, no chips, semantic tone — `0` online is red, "of 1 in fleet". `LIVE`/`STREAMING` badges now correct. |
| `00-analytics-BEFORE-empty-boxes.png` | Three charts rendering as blank cards. §0: "a missing chart entirely is not [acceptable]". |
| `03-analytics-empty-state.png` | Rebuilt with a real labelled empty state; totals in text tokens, not decorative green. |

### Kiosk Web (`screenshots/kiosk/`)

| File | What it shows |
|---|---|
| `00-splash-BEFORE-600px-column.png` | Content in a ~600px column with dead bands either side; emoji three-card grid; sub-20px copy. |
| `01-splash-fullbleed-1080.png` | Rebuilt. Full 1080px bleed, real mascot art, 78px display type, 124px primary target, wave divider, leaves confined to the hero. |
| `00-auth-BEFORE-broken-wave-no-disclosure.png` | Header band and wave separated by a white gap, stray mascot orb, 55% dead space, **no guest disclosure at all**. |
| `02-auth-with-guest-disclosure.png` | Rebuilt. Two explicit options; §4.4's required guest-credit disclosure now stated **before** the choice. |

---

## Real bugs this pass found (not cosmetic)

Each was found on a screenshot or console log of a running instance, not by
reading source:

1. **Kiosk shell capped at 600px.** `KioskRoot.tsx` limited every kiosk screen to
   `maxWidth: 600`, justified by a comment about "a 15.6-inch landscape
   touchscreen". The real kiosk is 1080×1920 portrait. Every screen on the
   surface had been rendering as a narrow column. Fixed to 1080.
2. **Admin SSE badge stuck on "Connecting…" forever.** `live` was driven off the
   first *message*; an idle fleet correctly sends none. Now driven off
   `EventSource.onopen`. Verified showing `LIVE`.
3. **React hydration mismatch on the kiosk auth page** — the error that had been
   carried on the checklist as "needs an architectural fix in a future pass".
   Root cause: the QR session token was generated in a `useState` initialiser
   from `Date.now()`/`Math.random()`, so server and client encoded different
   tokens into different SVG paths. Moved to an effect. Console now clean.
4. **Falling leaves drifted over the primary CTA.** `position: fixed` pinned them
   to the viewport instead of their band. §1 forbids motion behind content.
5. **`0 kiosks online` rendered green** — actively contradicting §2's convention,
   where green means healthy.
6. **`client/web_console/.env.local` still pointed at the dead Render URL**
   (`ecocharge-api.onrender.com`), months after that host was decommissioned.

---

## Still open — stated honestly

- Kiosk: `/session`, `/session/deposit`, `/session/charging`, `/session/result`,
  `/session/credits`, `/receipt/*`, `/auth/linked`, `/auth/linking` have **not**
  been re-checked at 1080×1920 since the width fix. They inherit the full-bleed
  correction automatically, but each needs its own screenshot pass before being
  called done.
- Kiosk §4.4 bin-full screen: still not built.
- Kiosk §2 bottle-fill loading and §4.3a bottle-crush animations: not built (no
  Lottie asset vendored yet).
- Kiosk §4.6 numeric keypad / OTP sheet: deliberately not built — the real auth
  is QR + guest, so there is no live screen to wire them into.
- Mobile App: only Home's balance card was rebuilt in an earlier pass. The
  remaining screens are untouched by this redo.
- Website: not re-examined in this pass.
- Admin: the remaining 8 data pages were rebuilt in an earlier pass but have not
  been re-screenshotted since the StatsCard/token changes here.
