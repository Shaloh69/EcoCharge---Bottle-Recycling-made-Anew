"use client";
import { useRouter } from "next/navigation";

import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotAvatar } from "@/components/kiosk/MascotDisplay";

export default function CreditReceiptPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen page-enter">
      <KioskHeader showAccount />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Receipt card */}
        <div
          className="glass-white rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center gap-4 bounce-in"
          style={{ animationDelay: "0.05s" }}
        >
          {/* Success icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl float-anim"
            style={{
              background: "linear-gradient(135deg, #4ADE80, #16A34A)",
              boxShadow: "0 0 32px rgba(76,175,80,0.4)",
            }}
          >
            💳
          </div>

          <h2 className="text-green-700 text-2xl font-extrabold">
            Credits Added!
          </h2>

          <div className="w-full border-t border-gray-100 pt-4 space-y-3 text-center">
            <div
              className="rounded-2xl px-4 py-3"
              style={{
                background: "rgba(76,175,80,0.08)",
                border: "1px solid rgba(76,175,80,0.2)",
              }}
            >
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">
                Credits Earned
              </p>
              <p className="text-green-700 text-3xl font-extrabold">+ 5 min</p>
            </div>

            <div
              className="rounded-2xl px-4 py-3"
              style={{ background: "rgba(0,0,0,0.04)" }}
            >
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">
                Total Balance
              </p>
              <p className="text-gray-800 text-2xl font-extrabold">10 min</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl">🌿</span>
            <span className="text-green-700 font-bold">EcoCharge</span>
          </div>
        </div>

        <MascotAvatar mood="happy" />

        <p
          className="text-white/50 text-sm text-center max-w-xs page-fade"
          style={{ animationDelay: "0.2s" }}
        >
          Credits saved to your account. Use them anytime to charge your phone.
        </p>

        <button
          className="glass-btn-primary w-full max-w-sm py-5 rounded-2xl text-xl font-extrabold transition-all active:scale-95 page-fade"
          style={{ animationDelay: "0.3s" }}
          onClick={() => router.push("/")}
        >
          Thank You 🎉
        </button>
      </div>
    </div>
  );
}
