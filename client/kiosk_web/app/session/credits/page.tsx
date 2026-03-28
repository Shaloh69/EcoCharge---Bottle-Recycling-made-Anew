"use client";
import { useRouter } from "next/navigation";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { BackButton } from "@/components/kiosk/BackButton";

export default function CreditsPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B5E20" }}>
      <KioskHeader showAccount />
      <div className="flex-1 flex flex-col items-center px-6 pt-6 gap-6">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-lg text-center">
          <p className="text-gray-500 text-sm mb-1">Plastic Bottles</p>
          <p className="text-gray-800 text-4xl font-bold">1</p>
          <p className="text-gray-500 text-sm mt-2">Time Credit</p>
          <p className="text-green-700 text-3xl font-bold">00 : 01 : 00 min</p>
          <div className="flex gap-3 mt-4">
            <button className="flex-1 py-3 rounded-xl bg-green-700 text-white font-semibold text-sm shadow">🍶 Plastic Bottle</button>
            <button className="flex-1 py-3 rounded-xl border-2 border-green-200 text-green-800 font-semibold text-sm">💳 View Credit</button>
          </div>
        </div>
        <button
          onClick={() => router.push("/session/deposit?mode=credit")}
          className="w-full max-w-sm py-4 rounded-2xl bg-white text-green-800 text-lg font-bold shadow-xl hover:bg-green-50 transition-all active:scale-95">
          + Add to Credit
        </button>
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-lg">
          <p className="text-gray-500 text-sm font-semibold mb-1">Current Credit:</p>
          <p className="text-green-700 text-3xl font-bold">00 : 05 : 00 min</p>
        </div>
        <button onClick={() => router.push("/receipt/credit")}
          className="w-full max-w-sm py-5 rounded-2xl bg-white text-green-800 text-xl font-bold shadow-xl hover:bg-green-50 transition-all active:scale-95">
          Use Credit →
        </button>
      </div>
      <div className="px-6 pb-6">
        <BackButton href="/session" />
      </div>
    </div>
  );
}
