"use client";
import { useRouter } from "next/navigation";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";

const OPTIONS = [
  {
    href: "/session/deposit?mode=charge",
    icon: "⚡",
    label: "Charge",
    sub: "Use credits to charge your phone",
    bg: "rgba(245,158,11,0.14)",
    border: "rgba(245,158,11,0.35)",
    glow: "rgba(245,158,11,0.2)",
    accent: "#FCD34D",
  },
  {
    href: "/session/deposit?mode=credit",
    icon: "💳",
    label: "Credits",
    sub: "Check or top-up your balance",
    bg: "rgba(76,175,80,0.14)",
    border: "rgba(76,175,80,0.35)",
    glow: "rgba(76,175,80,0.2)",
    accent: "#86EFAC",
  },
];

export default function SessionPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen page-enter">
      <KioskHeader showAccount />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-7 py-8">
        {/* heading */}
        <div
          className="text-center page-fade"
          style={{ animationDelay: "0.1s" }}
        >
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
            What would you like to do?
          </p>
          <h2 className="text-white text-4xl font-extrabold tracking-tight">
            Select Mode
          </h2>
        </div>

        {/* option buttons */}
        <div
          className="w-full space-y-4 page-scale"
          style={{ animationDelay: "0.2s" }}
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.href}
              className="w-full rounded-3xl p-6 flex items-center gap-5 text-left transition-all active:scale-95"
              style={{
                background: opt.bg,
                border: `1.5px solid ${opt.border}`,
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                boxShadow: `0 4px 24px ${opt.glow}`,
              }}
              onClick={() => router.push(opt.href)}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                style={{
                  background: opt.bg,
                  border: `1.5px solid ${opt.border}`,
                }}
              >
                {opt.icon}
              </div>
              <div>
                <p className="text-white text-2xl font-bold leading-tight">
                  {opt.label}
                </p>
                <p className="text-white/45 text-sm mt-0.5">{opt.sub}</p>
              </div>
              <span className="ml-auto text-white/30 text-2xl">›</span>
            </button>
          ))}
        </div>

        {/* recycle prompt */}
        <div
          className="w-full glass rounded-3xl p-5 text-center page-fade"
          style={{ animationDelay: "0.35s" }}
        >
          <p className="text-4xl float-anim mb-2">🍶</p>
          <p className="text-white font-bold text-lg">Have a bottle?</p>
          <p className="text-white/40 text-sm">
            Drop it in the slot above to earn credits.
          </p>
        </div>
      </div>

      <div className="px-6 pb-8">
        <BackButton href="/auth/linked" />
      </div>
    </div>
  );
}
