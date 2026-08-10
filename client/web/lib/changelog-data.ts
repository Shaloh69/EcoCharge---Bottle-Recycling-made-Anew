/**
 * Real, dated entries sourced from actual project history (memory.md / git
 * log) — never invented. Single source of truth for both /changelog and
 * /update-required, so the two pages can't silently drift apart. Update by
 * checking real history, not by guessing what "should" have shipped. Per
 * docs/planning/02-design-mandate.md SS6.
 */
export interface ChangelogEntry {
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: "2026-08-11",
    title:
      "Self-hosted infrastructure, security hardening, and a real bug-fix pass across every surface",
    items: [
      "Moved off third-party hosting entirely — the API, admin console, and AI detection service now run on infrastructure the team fully controls.",
      "Closed a real gap before making the admin console reachable outside the team's private network: added rate limiting to admin login.",
      "Added real automated test coverage for the first time — backend, AI detection service, and a full end-to-end integration suite.",
      "Fixed a bug where the admin dashboard's offline-kiosk alert banner had never actually fired, despite looking correct.",
      "Fixed a theming bug where switching the admin console to light mode silently had no effect on most of the interface.",
      "Added a real animated falling-leaves background to the kiosk's idle screen.",
      "Fixed three real bugs that were silently blocking the mobile app from building at all, including a broken avatar-upload path.",
      "Full documentation audit across the project, to keep the written plan honest against what's actually shipped.",
    ],
  },
  {
    date: "2026-08-10",
    title: "Component library rebuild, real AI training run, planning overhaul",
    items: [
      "Kiosk and Admin Console both moved off HeroUI — Admin Console now runs on Mantine, the Kiosk on shadcn/ui — as a full rebuild, not a re-theme.",
      "Fixed a banned default-font regression (Inter) on both apps; wired the real typography system instead.",
      "Kicked off a real model training run against an expanded, corrected training/validation split.",
      "Full project documentation and planning audit, so the plan actually matches the shipped system.",
    ],
  },
  {
    date: "2026-07-22",
    title: "Security hardening and guest-flow protections",
    items: [
      "Closed unauthenticated kiosk telemetry endpoints.",
      "Added a hard server-side cutoff so deposits stop once a bin is full, instead of risking a physical jam.",
      "Rate-limited guest session, deposit, and charging-start endpoints.",
      "Added automatic recovery for charging sessions left stranded by an offline kiosk.",
      "Removed a legacy backend prototype and other dead code.",
    ],
  },
];
