"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { userStore } from "@/lib/api";

export default function LinkedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const linkedUser = userStore.get();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.push("/session");

          return 0;
        }

        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const firstName = linkedUser?.name?.split(" ")[0] ?? "Guest";

  return (
    <div className="flex flex-col min-h-screen page-enter">
      <KioskHeader showAccount />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 py-8">
        {/* Welcome card */}
        <div
          className="glass-white rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center gap-4 bounce-in"
          style={{ animationDelay: "0.1s" }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: "linear-gradient(135deg, #4ADE80, #16A34A)",
              boxShadow: "0 0 24px rgba(76,175,80,0.4)",
            }}
          >
            👤
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm">Signed in as</p>
            <p className="text-gray-800 text-2xl font-extrabold">
              {linkedUser?.name ?? "Guest"}
            </p>
          </div>

          {linkedUser?.phone && (
            <div className="w-full border-t border-gray-100 pt-3 text-center">
              <p className="text-gray-400 text-xs">Phone</p>
              <p className="text-gray-700 font-medium">{linkedUser.phone}</p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl">🌿</span>
            <span className="text-green-700 font-bold">EcoCharge</span>
          </div>
        </div>

        {/* Welcome message */}
        <div
          className="text-center page-fade"
          style={{ animationDelay: "0.25s" }}
        >
          <h2 className="text-white text-4xl font-extrabold tracking-tight">
            Welcome back,
            <br />
            <span style={{ color: "#4ADE80" }}>{firstName}!</span>
          </h2>
          <p className="text-white/40 text-sm mt-2">
            Auto-continues in {countdown}s…
          </p>
        </div>

        {/* CTA */}
        <button
          className="glass-btn-primary w-full max-w-sm py-5 rounded-2xl text-xl font-bold transition-all active:scale-95 page-fade"
          style={{ animationDelay: "0.35s" }}
          onClick={() => router.push("/session")}
        >
          Let&apos;s Go →
        </button>
      </div>

      <div className="px-6 pb-8">
        <BackButton href="/auth" />
      </div>
    </div>
  );
}
