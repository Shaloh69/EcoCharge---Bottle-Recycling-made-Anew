"use client";
import { BackButton } from "@/components/kiosk/BackButton";
import { BinIndicator } from "@/components/kiosk/BinIndicator";
import { KioskHeader } from "@/components/kiosk/KioskHeader";

export default function BinPage() {
  const level = 70;
  const statusColor =
    level > 90 ? "#FCA5A5" : level > 70 ? "#FCD34D" : "#4ADE80";
  const statusLabel =
    level > 90 ? "Full — notify staff" : level > 70 ? "Getting full" : "Good";

  return (
    <div className="flex flex-col min-h-screen page-enter">
      <KioskHeader showAccount />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Header */}
        <div
          className="text-center page-fade"
          style={{ animationDelay: "0.1s" }}
        >
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
            Live Monitoring
          </p>
          <h2 className="text-white text-3xl font-extrabold tracking-tight">
            Bin Status
          </h2>
        </div>

        {/* Bin card */}
        <div
          className="glass rounded-3xl p-8 w-full max-w-sm flex flex-col items-center gap-5 page-scale"
          style={{ animationDelay: "0.15s" }}
        >
          <BinIndicator level={level} />

          <div className="text-center">
            <p className="text-white text-4xl font-extrabold">{level}%</p>
            <p
              className="text-sm font-semibold mt-1"
              style={{ color: statusColor }}
            >
              {statusLabel}
            </p>
          </div>

          {/* Level bar */}
          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${level}%`,
                background: `linear-gradient(90deg, #4ADE80, ${statusColor})`,
              }}
            />
          </div>
        </div>

        {/* Info */}
        <div
          className="glass-green rounded-2xl px-5 py-4 w-full max-w-sm text-center page-fade"
          style={{ animationDelay: "0.3s" }}
        >
          <p className="text-white/70 text-sm">
            Staff is automatically notified when the bin exceeds 90%.
          </p>
        </div>
      </div>

      <div className="px-6 pb-8">
        <BackButton href="/session" />
      </div>
    </div>
  );
}
