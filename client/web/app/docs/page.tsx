import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Docs" };

const SECTIONS = [
  {
    title: "For riders / recyclers",
    body: "How to use a kiosk, what happens to your bottle, how credits and charging work — see How it works.",
    href: "/how-it-works",
  },
  {
    title: "Guest vs. registered accounts",
    body: "Guests can deposit and charge without an account. Guest-earned credits go to a shared community account and can't be transferred to an account you register later — this is a deliberate, disclosed limitation, not a bug.",
  },
  {
    title: "Trust and safety",
    body: "Every stage of the deposit path is independently confirmed by its own sensor — the AI's accept decision and the bottle's physical drop are always checked separately, so a jam or a sensor glitch never silently costs you credits without a second check.",
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-extrabold text-eco-green-800">
        Documentation
      </h1>
      <p className="mt-4 text-[var(--color-muted)]">
        Public-facing docs for people using EcoCharge — for the full
        engineering documentation, see the project repository.
      </p>

      <div className="mt-10 space-y-6">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
          >
            <h2 className="font-display text-lg font-bold text-eco-green-800">
              {section.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{section.body}</p>
            {section.href && (
              <Link
                href={section.href}
                className="mt-3 inline-block text-sm font-semibold text-eco-green-600 hover:text-eco-green-700"
              >
                Read more →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
