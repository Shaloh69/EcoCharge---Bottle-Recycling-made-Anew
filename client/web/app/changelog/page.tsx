import type { Metadata } from "next";

import { CHANGELOG_ENTRIES } from "@/lib/changelog-data";

export const metadata: Metadata = { title: "Changelog" };

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
        {CHANGELOG_ENTRIES.map((entry) => (
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
