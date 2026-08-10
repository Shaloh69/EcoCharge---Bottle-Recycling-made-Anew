import type { Metadata } from "next";

import { DownloadClient } from "@/components/DownloadClient";

export const metadata: Metadata = { title: "Download" };

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

      <DownloadClient />
    </div>
  );
}
