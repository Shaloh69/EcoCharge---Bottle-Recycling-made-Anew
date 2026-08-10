import type { Metadata } from "next";

export const metadata: Metadata = { title: "Download" };

/**
 * Direct APK download, not a store-listing link — per
 * docs/planning/02-design-mandate.md SS6: there's no evidence this app is
 * published to any app store, so this page must not point at an assumed
 * listing that doesn't exist. Repoint this if a real store listing ever
 * ships; don't build toward one now.
 */
export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="font-display text-3xl font-extrabold text-eco-green-800">
        Get the EcoCharge app
      </h1>
      <p className="mt-4 text-[var(--color-muted)]">
        Link your account to a kiosk, track your credit balance, and view your
        deposit and charging history — the app isn&apos;t required to use a
        kiosk (you can always continue as a guest), but it&apos;s how you keep
        credits across visits.
      </p>

      <div className="mt-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <p className="font-display text-lg font-bold text-eco-green-800">
          Android
        </p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Not yet published to the Play Store — download the APK directly and
          install it manually (you&apos;ll need to allow installs from unknown
          sources).
        </p>
        <a
          href="/downloads/ecocharge.apk"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-eco-green-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-eco-green-700"
        >
          Download APK
        </a>
        <p className="mt-3 text-xs text-[var(--color-muted)]">
          Placeholder link — wire this up to a real built APK before this page
          goes live. See docs/planning/05-feature-build-checklist.md.
        </p>
      </div>
    </div>
  );
}
