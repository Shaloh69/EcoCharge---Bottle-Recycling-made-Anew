"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { BackButton } from "@/components/kiosk/BackButton";
import { userStore } from "@/lib/api";

export default function LinkedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const linkedUser = userStore.get();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); router.push("/session"); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B5E20" }}>
      <KioskHeader showAccount />
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-sm flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-4xl">👤</div>
          <div className="text-center">
            <p className="text-gray-500 text-sm">Name</p>
            <p className="text-gray-800 text-xl font-bold">
              {linkedUser?.name ?? "Guest"}
            </p>
          </div>
          {linkedUser?.phone && (
            <div className="w-full border-t border-gray-100 pt-3 text-center">
              <p className="text-gray-500 text-sm">Number</p>
              <p className="text-gray-700 font-medium">{linkedUser.phone}</p>
            </div>
          )}
          <div className="mt-2 text-center">
            <span className="text-2xl">🌿</span>
            <span className="text-green-700 font-bold ml-1">EcoCharge</span>
          </div>
        </div>
        <h2 className="text-white text-3xl font-bold">
          Welcome
          {linkedUser?.name ? `, ${linkedUser.name.split(" ")[0]}!` : "!"}
        </h2>
        <button
          onClick={() => router.push("/session")}
          className="w-full max-w-sm py-5 rounded-2xl bg-white text-green-800 text-xl font-bold shadow-xl hover:bg-green-50 transition-colors active:scale-95"
        >
          Let&apos;s Go →
        </button>
        <p className="text-white/60 text-base">Auto-continues in {countdown}s...</p>
      </div>
      <div className="px-6 pb-6">
        <BackButton href="/auth" />
      </div>
    </div>
  );
}
