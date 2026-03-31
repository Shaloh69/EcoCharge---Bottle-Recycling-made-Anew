"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotFull } from "@/components/kiosk/MascotDisplay";

function ResultContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") ?? "charge";
  const accepted = params.get("status") === "accepted";

  return (
    <div className="flex flex-col min-h-screen page-enter">
      <KioskHeader showAccount />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <MascotFull mood={accepted ? "happy" : "sad"} />

        {/* Result card */}
        <div
          className="glass-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center bounce-in"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="text-6xl mb-3 float-anim">
            {accepted ? "✅" : "❌"}
          </div>
          <h2
            className="text-2xl font-extrabold mb-2"
            style={{ color: accepted ? "#16A34A" : "#DC2626" }}
          >
            {accepted ? "Bottle Accepted!" : "Bottle Rejected"}
          </h2>
          <p className="text-gray-500 text-base leading-relaxed">
            {accepted
              ? `Credits earned! Mode: ${mode}`
              : "Bottle does not meet requirements. Please try again."}
          </p>
        </div>

        {/* Action button */}
        {accepted ? (
          <button
            className="glass-btn-primary w-full max-w-sm py-5 rounded-2xl text-xl font-bold transition-all active:scale-95 page-fade"
            style={{ animationDelay: "0.25s" }}
            onClick={() =>
              router.push(
                mode === "charge" ? "/session/charging" : "/session/credits",
              )
            }
          >
            Continue →
          </button>
        ) : (
          <button
            className="w-full max-w-sm py-5 rounded-2xl text-xl font-bold transition-all active:scale-95 page-fade"
            style={{
              animationDelay: "0.25s",
              background: "linear-gradient(135deg, #DC2626, #991B1B)",
              color: "white",
              boxShadow: "0 8px 32px rgba(220,38,38,0.35)",
            }}
            onClick={() => router.push("/session/deposit")}
          >
            Try Again
          </button>
        )}
      </div>

      <div className="px-6 pb-8">
        <BackButton href="/session/deposit" />
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  );
}
