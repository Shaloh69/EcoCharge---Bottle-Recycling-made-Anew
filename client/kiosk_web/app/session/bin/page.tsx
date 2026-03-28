"use client";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { BinIndicator } from "@/components/kiosk/BinIndicator";
import { BackButton } from "@/components/kiosk/BackButton";

export default function BinPage() {
  const level = 70;
  const getBg = (l: number) => l > 90 ? "#7f1d1d" : l > 70 ? "#78350f" : l > 50 ? "#713f12" : "#1B5E20";
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: getBg(level) }}>
      <KioskHeader showAccount />
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <div className="bg-white/10 rounded-2xl p-8 flex flex-col items-center gap-4 w-full max-w-sm">
          <p className="text-white text-lg font-semibold">Trash Bin Monitoring</p>
          <BinIndicator level={level} />
        </div>
      </div>
      <div className="px-6 pb-6">
        <BackButton href="/session" />
      </div>
    </div>
  );
}
