"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotFull } from "@/components/kiosk/MascotDisplay";

export default function LinkingPage() {
  const router = useRouter();
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d + 1) % 4), 600);
    const timeout = setTimeout(() => router.push("/auth/linked"), 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="flex flex-col flex-1 page-enter">
      <KioskHeader />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <MascotFull mood="scanning" />

        <div
          className="glass-white rounded-3xl p-8 flex flex-col items-center gap-5 w-full max-w-sm shadow-2xl page-scale"
          style={{ animationDelay: "0.15s" }}
        >
          <h2 className="text-gray-800 text-2xl font-bold text-center">
            Waiting for your phone{".".repeat(dots)}
          </h2>
          <div className="flex gap-3 mt-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: dots > i ? "#16A34A" : "#D1D5DB",
                  transform: dots > i ? "scale(1.25)" : "scale(1)",
                }}
              />
            ))}
          </div>
          <p className="text-gray-400 text-sm text-center">
            Keep your phone screen on and near the kiosk.
          </p>
        </div>

        <button
          className="glass-btn-secondary w-full max-w-sm py-4 rounded-2xl text-lg font-semibold transition-all active:scale-95"
          onClick={() => router.push("/auth")}
        >
          Cancel
        </button>
      </div>

      <div className="px-6 pb-8">
        <BackButton href="/auth" />
      </div>
    </div>
  );
}
