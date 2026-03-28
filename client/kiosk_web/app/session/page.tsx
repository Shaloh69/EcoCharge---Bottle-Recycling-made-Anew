"use client";
import { useRouter } from "next/navigation";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { BackButton } from "@/components/kiosk/BackButton";

export default function SessionPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B5E20" }}>
      <KioskHeader showAccount />
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <h2 className="text-white text-3xl font-bold">Select your Preference</h2>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          <button onClick={() => router.push("/session/deposit?mode=charge")}
            className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-lg hover:bg-green-50 active:scale-95 transition-all">
            <span className="text-5xl">⚡</span>
            <span className="text-green-800 text-xl font-bold">Charge</span>
          </button>
          <button onClick={() => router.push("/session/deposit?mode=credit")}
            className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-lg hover:bg-green-50 active:scale-95 transition-all">
            <span className="text-5xl">💳</span>
            <span className="text-green-800 text-xl font-bold">Credit</span>
          </button>
        </div>
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="flex gap-2 text-4xl">🍶🍶🍶</div>
          <p className="text-white/60 font-bold tracking-widest text-lg">RECYCLE NOW</p>
        </div>
      </div>
      <div className="px-6 pb-6">
        <BackButton href="/auth/linked" />
      </div>
    </div>
  );
}
