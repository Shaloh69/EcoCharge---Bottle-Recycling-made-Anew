"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotAvatar } from "@/components/kiosk/MascotDisplay";
import { BackButton } from "@/components/kiosk/BackButton";
import { token, session, userStore } from "@/lib/api";

const KIOSK_ID = process.env.NEXT_PUBLIC_KIOSK_ID ?? "1";
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function AuthPage() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(120);
  const [sessionToken] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const qrValue = JSON.stringify({ kioskId: KIOSK_ID, sessionToken, action: "link" });

  // Poll for QR scan completion (Flutter app calls /api/kiosk/sessions then redirects)
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/kiosk/qr-status?token=${sessionToken}`, {
          headers: token.get() ? { Authorization: `Bearer ${token.get()}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.linked) {
            token.set(data.access_token);
            session.set(String(data.session_id));
            userStore.set(data.user);
            clearInterval(poll);
            router.push("/auth/linked");
          }
        }
      } catch {
        // polling — ignore errors
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [sessionToken, router]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); return 120; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleGuest = () => {
    token.clear();
    session.set("0");
    router.push("/auth/linking");
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B5E20" }}>
      <KioskHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <MascotAvatar mood="idle" />
        <h2 className="text-white text-3xl font-bold text-center">
          Link your EcoCharge App
        </h2>
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl w-full max-w-sm">
          <QRCode value={qrValue} size={200} />
          <p className="text-gray-500 text-sm">
            Refreshes in{" "}
            <span className="font-bold text-green-700">{formatTime(timeLeft)}</span>
          </p>
        </div>
        <p className="text-white/70 text-center text-base max-w-xs">
          Open the EcoCharge app and tap{" "}
          <span className="text-white font-semibold">&quot;Scan Kiosk&quot;</span> to link
          your account
        </p>
        <button
          onClick={handleGuest}
          className="w-full max-w-sm py-4 rounded-2xl border-2 border-white/50 text-white text-lg font-semibold hover:bg-white/10 transition-colors"
        >
          Continue as Guest
        </button>
      </div>
      <div className="px-6 pb-6">
        <BackButton href="/" />
      </div>
    </div>
  );
}
