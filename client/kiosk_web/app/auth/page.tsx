"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotAvatar } from "@/components/kiosk/MascotDisplay";
import { auth, session, token, userStore } from "@/lib/api";

const KIOSK_ID = process.env.NEXT_PUBLIC_KIOSK_ID ?? "1";
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

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
    <div className="flex flex-col flex-1">
      <KioskHeader />

      <motion.div
        className="flex-1 flex flex-col items-center px-8 py-8 gap-6"
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.09 }}
      >
        <motion.div variants={item} transition={{ duration: 0.3 }}>
          <MascotAvatar mood="idle" />
        </motion.div>

        <motion.div
          className="text-center"
          variants={item}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-white text-4xl font-extrabold tracking-tight">
            Link your App
          </h2>
          <p className="text-white/45 text-base mt-2">
            Scan with the EcoCharge mobile app
          </p>
        </motion.div>

        {/* QR card */}
        <motion.div
          className="glass-white rounded-3xl p-7 flex flex-col items-center gap-4 w-full shadow-2xl"
          variants={item}
          transition={{ duration: 0.35, type: "spring", bounce: 0.25 }}
        >
          <div
            className="rounded-2xl overflow-hidden p-3"
            style={{ background: "white" }}
          >
            <QRCode size={210} value={qrValue} />
          </div>
          <p className="text-gray-500 text-sm">
            Refreshes in{" "}
            <span className="font-bold text-green-700">
              {formatTime(timeLeft)}
            </span>
          </p>
        </motion.div>

        <motion.p
          className="text-white/55 text-center text-sm max-w-xs leading-relaxed"
          variants={item}
          transition={{ duration: 0.3 }}
        >
          Open EcoCharge and tap{" "}
          <span className="text-white font-semibold">
            &quot;Scan Kiosk&quot;
          </span>{" "}
          to link your account.
        </motion.p>

        {/* Guest button */}
        <motion.button
          disabled={guestLoading}
          className={`glass-btn-secondary w-full py-5 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${guestLoading ? "opacity-50" : ""}`}
          variants={item}
          transition={{ duration: 0.3 }}
          onClick={handleGuest}
        >
          {guestLoading ? "Please wait…" : "Continue as Guest"}
        </motion.button>
      </motion.div>

      <div className="px-8 pb-8">
        <BackButton href="/" />
      </div>
    </div>
  );
}
