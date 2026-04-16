"use client";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useRouter } from "next/navigation";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotAvatar } from "@/components/kiosk/MascotDisplay";
import { auth, session, token, userStore } from "@/lib/api";

const KIOSK_ID = process.env.NEXT_PUBLIC_KIOSK_ID ?? "1";
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function AuthPage() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(120);
  const [sessionToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const qrValue = JSON.stringify({
    kioskId: KIOSK_ID,
    sessionToken,
    action: "link",
  });

  // Poll for QR scan completion
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(
          `${API}/api/kiosk/qr-status?token=${sessionToken}`,
          {
            headers: token.get()
              ? { Authorization: `Bearer ${token.get()}` }
              : {},
          },
        );

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

  // Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);

          return 120;
        }

        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      const kioskId = parseInt(KIOSK_ID);
      const data = await auth.guest(kioskId);
      token.set(data.access_token);
      session.set(String(data.session_id));
      userStore.set(data.user);
      router.push("/auth/linking");
    } catch {
      // Backend unreachable — still let guest through with no session
      // (deposit will fail gracefully rather than crash on 401)
      token.clear();
      session.set("0");
      router.push("/auth/linking");
    } finally {
      setGuestLoading(false);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col flex-1 page-enter">
      <KioskHeader />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 py-8">
        <MascotAvatar mood="idle" />

        <div
          className="text-center page-fade"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="text-white text-3xl font-extrabold tracking-tight">
            Link your App
          </h2>
          <p className="text-white/45 text-sm mt-1">
            Scan with the EcoCharge mobile app
          </p>
        </div>

        {/* QR card */}
        <div
          className="glass-white rounded-3xl p-7 flex flex-col items-center gap-4 w-full max-w-sm shadow-2xl page-scale"
          style={{ animationDelay: "0.2s" }}
        >
          <div
            className="rounded-2xl overflow-hidden p-3"
            style={{ background: "white" }}
          >
            <QRCode size={190} value={qrValue} />
          </div>
          <p className="text-gray-500 text-sm">
            Refreshes in{" "}
            <span className="font-bold text-green-700">
              {formatTime(timeLeft)}
            </span>
          </p>
        </div>

        <p
          className="text-white/55 text-center text-sm max-w-xs leading-relaxed page-fade"
          style={{ animationDelay: "0.3s" }}
        >
          Open EcoCharge and tap{" "}
          <span className="text-white font-semibold">
            &quot;Scan Kiosk&quot;
          </span>{" "}
          to link your account.
        </p>

        {/* Guest button */}
        <button
          disabled={guestLoading}
          className={`glass-btn-secondary w-full max-w-sm py-4 rounded-2xl text-lg font-semibold transition-all active:scale-95 page-fade ${guestLoading ? "opacity-50" : ""}`}
          style={{ animationDelay: "0.4s" }}
          onClick={handleGuest}
        >
          {guestLoading ? "Please wait…" : "Continue as Guest"}
        </button>
      </div>

      <div className="px-6 pb-8">
        <BackButton href="/" />
      </div>
    </div>
  );
}
