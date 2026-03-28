"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotFull } from "@/components/kiosk/MascotDisplay";
import { BackButton } from "@/components/kiosk/BackButton";

function ResultContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") || "charge";
  const status = params.get("status") || "accepted";
  const accepted = status === "accepted";

  return (
    <div className="min-h-screen flex flex-col"
      style={{ backgroundColor: accepted ? "#1B5E20" : "#7f1d1d" }}>
      <KioskHeader showAccount />
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <MascotFull mood={accepted ? "happy" : "sad"} />
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
          <div className="text-6xl mb-3">{accepted ? "✅" : "❌"}</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: accepted ? "#1B5E20" : "#DC2626" }}>
            {accepted ? "Bottle Accepted!" : "Bottle Rejected"}
          </h2>
          <p className="text-gray-500 text-base">
            {accepted ? `1 minute credit earned · Mode: ${mode}` : "Bottle does not meet requirements. Please try again."}
          </p>
        </div>
        {accepted && (
          <button onClick={() => router.push(mode === "charge" ? "/session/charging" : "/session/credits")}
            className="w-full max-w-sm py-5 rounded-2xl bg-white text-green-800 text-xl font-bold shadow-xl hover:bg-green-50 transition-all active:scale-95">
            Continue →
          </button>
        )}
        {!accepted && (
          <button onClick={() => router.push("/session/deposit")}
            className="w-full max-w-sm py-5 rounded-2xl bg-white text-red-800 text-xl font-bold shadow-xl hover:bg-red-50 transition-all active:scale-95">
            Try Again
          </button>
        )}
      </div>
      <div className="px-6 pb-6">
        <BackButton href="/session/deposit" />
      </div>
    </div>
  );
}

export default function ResultPage() {
  return <Suspense><ResultContent /></Suspense>;
}
