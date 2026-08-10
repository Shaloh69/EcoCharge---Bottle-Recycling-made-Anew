import type { Metadata } from "next";

export const metadata: Metadata = { title: "How it works" };

const STAGES = [
  {
    title: "1. Start a session",
    body: "Scan the QR code shown on the kiosk with the EcoCharge app to link your account, or tap Continue as Guest — no registration required to recycle.",
  },
  {
    title: "2. Place your bottle",
    body: "An entrance sensor detects the bottle and starts the conveyor, nudging it forward every couple of seconds for fresh camera angles.",
  },
  {
    title: "3. AI grades it",
    body: "A two-stage vision pipeline detects the bottle, then classifies its brand, volume, and condition — the same few seconds the belt is moving.",
  },
  {
    title: "4. Drop and confirm",
    body: "Accepted bottles are dropped into the bin. A second, independent sensor confirms the physical drop before anything is credited — the AI's decision and the bottle's actual landing are always checked separately.",
  },
  {
    title: "5. Credits, by volume",
    body: "Bigger bottles earn more credits. Guest credits go to a shared community account and can't be transferred to an account you register later.",
  },
  {
    title: "6. Charge your phone",
    body: "Spend credits at any of the four charging ports — pick a port, see the countdown, unplug whenever you're done early.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-extrabold text-eco-green-800">
        How EcoCharge works
      </h1>
      <p className="mt-4 text-[var(--color-muted)]">
        The full lifecycle, one bottle at a time.
      </p>

      <div className="mt-12 space-y-8">
        {STAGES.map((stage) => (
          <div
            key={stage.title}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
          >
            <h2 className="font-display text-lg font-bold text-eco-green-800">
              {stage.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{stage.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
