import type { Metadata } from "next";

export const metadata: Metadata = { title: "Changelog" };

/**
 * Real, dated entries sourced from actual commit history — never invented.
 * Update this by checking `git log`, not by guessing what "should" have
 * shipped. Per docs/planning/02-design-mandate.md SS6.
 */
const ENTRIES = [
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

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-extrabold text-eco-green-800">
        Changelog
      </h1>
      <p className="mt-3 text-[var(--color-muted)]">
        What actually shipped, in order. Sourced from real commit history, not
        aspirational.
      </p>

      <ol className="mt-12 space-y-12 border-l border-[var(--color-border)] pl-8">
        {ENTRIES.map((entry) => (
          <li key={entry.date} className="relative">
            <span
              aria-hidden
              className="absolute -left-[calc(2rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full bg-eco-green-500"
            />
            <time className="text-sm font-semibold text-eco-green-600">
              {entry.date}
            </time>
            <h2 className="mt-1 font-display text-xl font-bold text-eco-green-800">
              {entry.title}
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-[var(--color-muted)]">
              {entry.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
