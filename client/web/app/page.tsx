import Link from "next/link";

import { AuroraBackground } from "@/components/aurora-background";

const LIFECYCLE = [
  {
    step: "01",
    title: "Deposit a bottle",
    body: "Walk up to a kiosk, scan your account QR (or continue as a guest), and drop a PET bottle on the conveyor.",
  },
  {
    step: "02",
    title: "AI grades it",
    body: "A two-stage vision pipeline — YOLO26 detection, then a brand/volume/condition classifier — identifies the bottle while it's still on the belt.",
  },
  {
    step: "03",
    title: "Earn credits",
    body: "Accepted bottles drop into the bin, a second sensor confirms the drop, and credits land on your account by volume tier.",
  },
  {
    step: "04",
    title: "Charge your phone",
    body: "Spend credits at any of the kiosk's charging ports — live wattage and a countdown the whole time.",
  },
];

const REPLACES = [
  {
    title: "vs. a normal recycling bin",
    body: "Nothing happens when you recycle today. EcoCharge turns the same bottle into something you can immediately use.",
  },
  {
    title: "vs. a paid power bank",
    body: "No subscription, no device to carry — the reward is earned on the spot, at the kiosk.",
  },
  {
    title: "vs. hoping someone sorts it later",
    body: "AI grading happens before the bottle ever reaches a bin, not after, in a truck, maybe.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--color-border)] px-6 pb-24 pt-20">
        <AuroraBackground />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-eco-green-200 bg-eco-green-50 px-3 py-1 text-xs font-semibold text-eco-green-700">
            <span aria-hidden>♻️</span> Reverse-vending, done properly
          </p>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-eco-green-800 sm:text-6xl">
            Recycle a bottle.
            <br />
            Charge your phone for free.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--color-muted)]">
            EcoCharge is a kiosk that AI-grades your plastic bottle on the spot and
            turns it straight into charging credits — no app required to start.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/download"
              className="rounded-md bg-eco-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-eco-green-700"
            >
              Get the app
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-md border border-eco-green-300 bg-white px-6 py-3 text-sm font-semibold text-eco-green-700 transition-colors hover:bg-eco-green-50"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-2xl font-bold text-eco-green-800 sm:text-3xl">
          The full loop, in four steps
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LIFECYCLE.map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            >
              <span className="font-display text-3xl font-extrabold text-eco-green-200">
                {item.step}
              </span>
              <h3 className="mt-3 font-display text-lg font-bold text-eco-green-800">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--color-border)] bg-eco-green-50/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-2xl font-bold text-eco-green-800 sm:text-3xl">
            What this actually replaces
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {REPLACES.map((item) => (
              <div key={item.title} className="rounded-lg bg-white p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-eco-green-800">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-bold text-eco-green-800 sm:text-3xl">
          Built for UC Lapu-Lapu and Mandaue
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[var(--color-muted)]">
          EcoCharge is a real, working thesis project — read the full system
          documentation or grab the app to link a kiosk session.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/download"
            className="rounded-md bg-eco-green-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-eco-green-700"
          >
            Get the app
          </Link>
          <Link
            href="/docs"
            className="rounded-md border border-eco-green-300 bg-white px-6 py-3 text-sm font-semibold text-eco-green-700 transition-colors hover:bg-eco-green-50"
          >
            Read the docs
          </Link>
        </div>
      </section>
    </>
  );
}
