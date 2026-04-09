"use client";
import { useRouter } from "next/navigation";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";

export default function CreditsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1 page-enter">
      <KioskHeader showAccount />

      <div className="flex-1 flex flex-col items-center px-6 pt-8 gap-5">
        {/* Balance card */}
        <div
          className="glass-white rounded-3xl p-7 w-full max-w-sm shadow-xl text-center page-scale"
          style={{ animationDelay: "0.1s" }}
        >
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">
            Credit Balance
          </p>
          <p className="text-green-700 text-5xl font-extrabold tracking-tight">
            00:05:00
          </p>
          <p className="text-gray-400 text-xs mt-1">minutes available</p>

          <div className="flex gap-3 mt-5">
            <button
              className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #16A34A, #14532D)",
              }}
            >
              🍶 Deposit
            </button>
            <button
              className="flex-1 py-3 rounded-xl font-semibold text-sm glass-green transition-all active:scale-95"
              style={{ color: "#4ADE80" }}
            >
              📊 History
            </button>
          </div>
        </div>

        {/* Latest deposit */}
        <div
          className="glass rounded-3xl p-5 w-full max-w-sm page-fade"
          style={{ animationDelay: "0.2s" }}
        >
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">
            Latest Deposit
          </p>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍶</span>
            <div>
              <p className="text-white font-bold">1 Plastic Bottle</p>
              <p className="text-white/40 text-sm">+1 min credit earned</p>
            </div>
          </div>
        </div>

        {/* Add credit */}
        <button
          className="glass-btn-secondary w-full max-w-sm py-4 rounded-2xl text-lg font-bold transition-all active:scale-95 page-fade"
          style={{ animationDelay: "0.28s" }}
          onClick={() => router.push("/session/deposit?mode=credit")}
        >
          + Add More Credits
        </button>

        {/* Use credit */}
        <button
          className="glass-btn-primary w-full max-w-sm py-5 rounded-2xl text-xl font-extrabold transition-all active:scale-95 page-fade"
          style={{ animationDelay: "0.35s" }}
          onClick={() => router.push("/receipt/credit")}
        >
          Use Credits →
        </button>
      </div>

      <div className="px-6 pb-8">
        <BackButton href="/session" />
      </div>
    </div>
  );
}
