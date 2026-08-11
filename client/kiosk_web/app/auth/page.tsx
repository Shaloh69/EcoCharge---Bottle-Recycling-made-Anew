"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { MascotAvatar } from "@/components/kiosk/MascotDisplay";
import { WaveDivider } from "@/components/kiosk/WaveDivider";
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
      {/* Solid-color header region cut by the deck's signature wave divider,
          per docs/planning/02-design-mandate.md SS4.6 — separates the
          header from the white body below. */}
      <div style={{ background: "#16A34A" }}>
        <KioskHeader onDark />
        <div className="px-8 pt-4 pb-2 text-center">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: -8 }}
          >
            <MascotAvatar mood="idle" />
          </motion.div>
        </div>
      </div>
      <WaveDivider color="#16A34A" />

      <motion.div
        animate="animate"
        className="flex-1 flex flex-col items-center px-8 pt-2 pb-8 gap-6"
        initial="initial"
        transition={{ staggerChildren: 0.09 }}
      >
        <motion.div
          className="text-center"
          transition={{ duration: 0.3 }}
          variants={item}
        >
          <h2 className="text-[#14231B] text-4xl font-extrabold tracking-tight">
            Link your App
          </h2>
          <p className="text-[#4A6B58] text-base mt-2">
            Scan with the EcoCharge mobile app
          </p>
        </motion.div>

        {/* QR card */}
        <motion.div
          className="rounded-3xl p-7 flex flex-col items-center gap-4 w-full"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5EFE8",
            boxShadow: "0 8px 32px rgba(20,35,27,0.08)",
          }}
          transition={{ duration: 0.35, type: "spring", bounce: 0.25 }}
          variants={item}
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
          className="text-[#4A6B58] text-center text-sm max-w-xs leading-relaxed"
          transition={{ duration: 0.3 }}
          variants={item}
        >
          Open EcoCharge and tap{" "}
          <span className="text-[#14231B] font-semibold">
            &quot;Scan Kiosk&quot;
          </span>{" "}
          to link your account.
        </motion.p>

        {/* Guest button */}
        <motion.button
          className={`glass-btn-secondary w-full py-5 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${guestLoading ? "opacity-50" : ""}`}
          disabled={guestLoading}
          transition={{ duration: 0.3 }}
          variants={item}
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
