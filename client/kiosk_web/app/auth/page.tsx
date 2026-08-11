"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import { ArrowLeft, Info, Smartphone } from "lucide-react";

import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { WaveDivider } from "@/components/kiosk/WaveDivider";
import { auth, session, token, userStore } from "@/lib/api";

const KIOSK_ID = process.env.NEXT_PUBLIC_KIOSK_ID ?? "1";
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

/**
 * Kiosk auth — full redo, 2026-08-11.
 *
 * Rebuilt after a screenshot at the real 1080x1920 showed the previous layout
 * breaking badly once the shell stopped being capped at 600px: the header's
 * solid band and its wave divider had a white gap between them (two separate
 * green bars), a stray mascot avatar orb sat over the header, and the whole
 * screen used its top 45% with a dead band below.
 *
 * It also shipped without the guest disclosure that SS4.4 requires — the one
 * piece of copy on this screen with a real user consequence, since guest
 * credits are pooled and can never be transferred to an account registered
 * later. That is now on the screen, next to the guest button, before the
 * choice is made rather than after.
 */
export default function AuthPage() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(120);

  /**
   * Real hydration bug, root-caused and fixed 2026-08-11 — this is the console
   * error that had been sitting open on the master checklist as "needs an
   * architectural fix in a future pass".
   *
   * The session token used to be generated in a `useState` initialiser from
   * `Date.now()` + `Math.random()`. That runs once during the server render and
   * again during the client render, producing two different tokens — and since
   * the token is encoded into the QR, React compared two genuinely different
   * SVG path strings and reported a hydration mismatch on every load.
   *
   * Generating it in an effect makes it unambiguously client-only: the server
   * renders the placeholder branch, the client fills it in after mount. No
   * mismatch, and the QR still refreshes exactly as before.
   */
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    setSessionToken(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }, []);

  const qrValue = sessionToken
    ? JSON.stringify({ kioskId: KIOSK_ID, sessionToken, action: "link" })
    : null;

  // Poll for QR scan completion (only once a token actually exists)
  useEffect(() => {
    if (!sessionToken) return;
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
      setTimeLeft((t) => (t <= 1 ? 120 : t - 1));
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
    <div className="flex flex-col flex-1" style={{ background: "#F6FBF7" }}>
      {/* ── Green header band, wave attached directly to it ──────────────── */}
      <div style={{ background: "#0F7A3D", flexShrink: 0 }}>
        <KioskHeader onDark />
        <div className="px-12 pb-8 pt-2">
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: -10 }}
            className="font-extrabold"
            style={{
              color: "#FFFFFF",
              fontSize: 62,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
            }}
          >
            How would you like
            <br />
            to continue?
          </motion.h1>
        </div>
        {/* No gap: the divider is part of this band, not a sibling below it. */}
        <div style={{ marginBottom: -1 }}>
          <WaveDivider color="#F6FBF7" />
        </div>
      </div>

      <motion.div
        animate="animate"
        className="flex-1 flex flex-col px-12 pt-2 pb-10"
        initial="initial"
        style={{ gap: 26 }}
        transition={{ staggerChildren: 0.09 }}
      >
        {/* ── Option 1: link the app (primary) ─────────────────────────── */}
        <motion.div
          className="flex flex-col items-center"
          style={{
            background: "#FFFFFF",
            border: "3px solid #16A34A",
            borderRadius: 32,
            padding: "34px 28px",
            gap: 18,
          }}
          transition={{ duration: 0.35, type: "spring", bounce: 0.22 }}
          variants={item}
        >
          <div className="flex items-center" style={{ gap: 12 }}>
            <Smartphone color="#0F7A3D" size={30} strokeWidth={2.5} />
            <p
              className="font-extrabold"
              style={{ color: "#14231B", fontSize: 36, letterSpacing: "-0.02em" }}
            >
              Scan with the app
            </p>
          </div>
          <p style={{ color: "#4A6B58", fontSize: 22, textAlign: "center" }}>
            Credits go straight to your own account.
          </p>

          <div
            className="flex items-center justify-center"
            style={{
              background: "#FFFFFF",
              padding: 16,
              borderRadius: 20,
              border: "1px solid #E5EFE8",
              width: 332,
              height: 332,
            }}
          >
            {qrValue ? (
              <QRCode size={300} value={qrValue} />
            ) : (
              // Same footprint as the real QR so nothing jumps on mount.
              <div
                aria-label="Preparing code"
                role="status"
                style={{
                  width: 300,
                  height: 300,
                  borderRadius: 12,
                  background: "#F1F7F3",
                }}
              />
            )}
          </div>

          <p style={{ color: "#4A6B58", fontSize: 20 }}>
            Refreshes in{" "}
            <span
              className="font-bold"
              style={{ color: "#0F7A3D", fontVariantNumeric: "tabular-nums" }}
            >
              {formatTime(timeLeft)}
            </span>
          </p>
        </motion.div>

        {/* ── Option 2: guest, with the disclosure SS4.4 requires ───────── */}
        <motion.div
          style={{
            background: "#FFFFFF",
            border: "2px solid #E5EFE8",
            borderRadius: 32,
            padding: "28px 28px 30px",
          }}
          transition={{ duration: 0.3 }}
          variants={item}
        >
          <p
            className="font-extrabold"
            style={{ color: "#14231B", fontSize: 32, letterSpacing: "-0.02em" }}
          >
            Continue as guest
          </p>

          {/* Required disclosure (SS4.4). Stated before the choice, not after —
              a first-time guest otherwise has no reason to assume registering
              later will not retroactively claim these credits. */}
          <div
            className="flex"
            style={{
              gap: 12,
              marginTop: 14,
              background: "#FFFBEB",
              border: "2px solid #FDE68A",
              borderRadius: 18,
              padding: "16px 18px",
            }}
          >
            <Info
              color="#B45309"
              size={24}
              strokeWidth={2.5}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <p style={{ color: "#7C4A02", fontSize: 20, lineHeight: 1.45 }}>
              Guest credits go to a shared community account and{" "}
              <span style={{ fontWeight: 700 }}>can&apos;t be transferred</span>{" "}
              to an account you register later.
            </p>
          </div>

          <button
            className="w-full font-bold transition-transform active:scale-[0.98]"
            disabled={guestLoading}
            style={{
              marginTop: 20,
              height: 92,
              borderRadius: 46,
              background: guestLoading ? "#E5EFE8" : "#FFFFFF",
              border: "3px solid #0F7A3D",
              color: "#0F7A3D",
              fontSize: 30,
            }}
            onClick={handleGuest}
          >
            {guestLoading ? "Please wait…" : "Continue as Guest"}
          </button>
        </motion.div>

        {/* Back is always reachable — kiosk convention, and this is the only
            way out of the flow without waiting for the idle timeout. */}
        <motion.button
          className="flex items-center justify-center transition-transform active:scale-[0.98]"
          style={{
            marginTop: "auto",
            gap: 12,
            height: 76,
            borderRadius: 38,
            border: "2px solid #D6E7DC",
            color: "#4A6B58",
            fontSize: 24,
            fontWeight: 600,
          }}
          transition={{ duration: 0.3 }}
          variants={item}
          onClick={() => router.push("/")}
        >
          <ArrowLeft size={26} strokeWidth={2.5} />
          Back
        </motion.button>
      </motion.div>
    </div>
  );
}
