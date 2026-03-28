"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotFull } from "@/components/kiosk/MascotDisplay";
import { BackButton } from "@/components/kiosk/BackButton";

export default function LinkingPage() {
  const router = useRouter();
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setDots(d => (d + 1) % 4), 600);
    // Simulate linking after 4 seconds for demo
    const timeout = setTimeout(() => router.push("/auth/linked"), 4000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B5E20" }}>
      <KioskHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <MascotFull mood="scanning" />
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl w-full max-w-sm">
          <h2 className="text-gray-800 text-2xl font-bold">Waiting for your phone{".".repeat(dots)}</h2>
          <div className="flex gap-3 mt-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-4 h-4 rounded-full transition-all duration-300"
                style={{ backgroundColor: dots > i ? "#2E7D32" : "#D1D5DB", transform: dots > i ? "scale(1.2)" : "scale(1)" }} />
            ))}
          </div>
        </div>
        <button
          onClick={() => router.push("/auth")}
          className="w-full max-w-sm py-4 rounded-2xl border-2 border-white/50 text-white text-lg font-semibold hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
      </div>
      <div className="px-6 pb-6">
        <BackButton href="/auth" />
      </div>
    </div>
  );
}
