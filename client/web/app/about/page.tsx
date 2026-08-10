import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-extrabold text-eco-green-800">
        About EcoCharge
      </h1>
      <div className="mt-6 space-y-4 text-[var(--color-muted)]">
        <p>
          EcoCharge is a 2026 thesis project built at the University of Cebu
          Lapu-Lapu and Mandaue. It&apos;s a reverse-vending kiosk: deposit a PET
          bottle, an ESP32-driven conveyor and a two-stage AI vision pipeline
          grade it, and credits are awarded by volume tier — spendable on
          phone charging at one of four relay-switched AC ports.
        </p>
        <p>
          The system incentivizes recycling with something people can use
          immediately, rather than relying on goodwill alone — closing the
          loop between plastic waste and a tangible, on-the-spot reward.
        </p>
        <p>
          Full, code-verified system documentation lives in the project
          repository (<code>analyzation.md</code>) for anyone curious about
          exactly how it works under the hood.
        </p>
      </div>
    </div>
  );
}
