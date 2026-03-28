"use client";
import { useRouter } from "next/navigation";
import { MascotFull } from "@/components/kiosk/MascotDisplay";

export default function SplashPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-12 px-6"
      style={{ backgroundColor: "#1B5E20" }}>
      <div className="flex items-center gap-2">
        <span className="text-3xl">🌿</span>
        <span className="text-white text-2xl font-bold">EcoCharge</span>
      </div>
      <div className="flex flex-col items-center gap-8">
        <MascotFull mood="idle" />
        <div className="text-center">
          <h1 className="text-white text-4xl font-bold mb-2">Welcome</h1>
          <p className="text-white/70 text-lg">Recycle bottles. Earn charging credits.</p>
        </div>
      </div>
      <button
        onClick={() => router.push("/auth")}
        className="w-full max-w-sm py-5 rounded-2xl bg-white text-green-800 text-xl font-bold shadow-xl hover:bg-green-50 transition-colors active:scale-95"
      >
        Touch to Proceed
      </button>
    </div>
  );
}
