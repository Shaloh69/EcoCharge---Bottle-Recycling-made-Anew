import type { Metadata } from "next";

import { CHANGELOG_ENTRIES } from "@/lib/changelog-data";

export const metadata: Metadata = { title: "Update Required" };

/**
 * Hard-block landing target for outdated app installs, per the 2026-08-11
 * app-distribution work item. Shows the real latest release's highlights
 * (sourced from the same CHANGELOG_ENTRIES the /changelog page uses — one
 * list, not two that can drift), not invented copy.
 *
 * Real gap, not silently hidden: the mandate this was modeled on
 * (a sibling project's pattern) also credits whichever user reported a bug
 * that's fixed in the release. EcoCharge has no real feedback/bug-report
 * pipeline yet (confirmed absent — docs/planning/06-must-have-app-features.md
 * SS1's "Applied to EcoCharge" appendix), so there's no real data to credit
 * anyone with. Not fabricating a name here — that's real, separate feature
 * work (a feedback model + admin queue) needed before this page can do that
 * part honestly.
 *
 * Also not yet built: the mobile app's own in-app version-check that would
 * redirect a real outdated install to this page. This page is a real,
 * ready target for that check to link to — the check itself is Flutter-side
 * future work, tracked in docs/planning/08-master-checklist.md.
 */
export default function UpdateRequiredPage() {
  const latest = CHANGELOG_ENTRIES[0];

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-3xl">
        ⚠️
      </div>
      <h1 className="mt-6 font-display text-3xl font-extrabold text-eco-green-800">
        Update required
      </h1>
      <p className="mt-4 text-[var(--color-muted)]">
        Your version of the EcoCharge app is too old to talk to the current
        kiosk network. Update to keep using it — this isn&apos;t optional
        for this release.
      </p>

      <div className="mt-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-eco-green-600">
          What&apos;s new — {latest.date}
        </p>
        <h2 className="mt-1 font-display text-lg font-bold text-eco-green-800">
          {latest.title}
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-[var(--color-muted)]">
          {latest.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <a
        href="/download"
        className="mt-8 inline-flex items-center gap-2 rounded-md bg-eco-green-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-eco-green-700"
      >
        Download the latest version
      </a>
      <p className="mt-4 text-xs text-[var(--color-muted)]">
        <a href="/changelog" className="underline">
          See the full changelog
        </a>
      </p>
    </div>
  );
}
