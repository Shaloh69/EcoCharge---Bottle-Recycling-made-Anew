"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MascotAvatar } from "@/components/kiosk/MascotDisplay";
import { KioskHeader } from "@/components/kiosk/KioskHeader";

function ChargeReceiptContent() {
  const router = useRouter();
  const params = useSearchParams();
  const station = params.get("station") || "1";
  const cs = typeof window !== "undefined"
    ? JSON.parse(sessionStorage.getItem("chargingSession") ?? "{}")
    : {};
  const minutes = cs.duration_seconds ? Math.round(cs.duration_seconds / 60) : 10;

  const handleDone = () => {
    sessionStorage.removeItem("lastDeposit");
    sessionStorage.removeItem("chargingSession");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B5E20" }}>
      <KioskHeader showAccount />
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">
            ✅
          </div>
          <h2 className="text-green-700 text-2xl font-bold">Charging Started!</h2>
          <div className="w-full border-t border-gray-100 pt-4 space-y-3 text-center">
            <p className="text-gray-500 text-sm">Charge your gadget on</p>
            <p className="text-gray-800 text-xl font-bold">Station {station}</p>
            <p className="text-gray-500 text-sm mt-3">Charging Time</p>
            <p className="text-green-700 text-2xl font-bold">{minutes} min</p>
          </div>
          <div className="mt-2 text-center">
            <span className="text-xl">🌿</span>
            <span className="text-green-700 font-bold ml-1">EcoCharge</span>
          </div>
        </div>
        <MascotAvatar mood="happy" />
        <button
          onClick={handleDone}
          className="w-full max-w-sm py-5 rounded-2xl bg-white text-green-800 text-xl font-bold shadow-xl hover:bg-green-50 transition-all active:scale-95"
        >
          Thank You 🎉
        </button>
      </div>
    </div>
  );
}

export default function ChargeReceiptPage() {
  return (
    <Suspense>
      <ChargeReceiptContent />
    </Suspense>
  );
}
