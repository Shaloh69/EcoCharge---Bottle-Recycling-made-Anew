"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2, Zap } from "lucide-react";

import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { WaveDivider } from "@/components/kiosk/WaveDivider";

/**
 * Bin-full cutoff screen — docs/planning/02-design-mandate.md SS4.4.
 *
 * Built 2026-08-11. This was a real, load-bearing gap, not a cosmetic one:
 * the server has refused deposits at bin level >= 95% with `409 {error:
 * "bin_full"}` since the security pass, but a grep across `client/kiosk_web`
 * found **zero** references to `bin_full` anywhere — so the one state the
 * backend deliberately protects against had no screen at all, and a user at a
 * full kiosk got a generic failure with no explanation and no next step.
 *
 * SS4.4 specifies the treatment exactly: "Bin's full — thanks for recycling!
 * Please try again later," with a next action, never a raw error toast. The
 * amber/warning register is deliberate — this is a degraded state, not a
 * failure the user caused, so it must not read as red/rejected (SS2's status
 * convention). Charging still works with existing credits, so that path stays
 * open and is offered as the real next action rather than a dead end.
 */
export default function BinFullPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1" style={{ background: "#F6FBF7" }}>
      {/* Amber hero — degraded, not rejected */}
      <div style={{ background: "#B45309", flexShrink: 0 }}>
        <KioskHeader onDark />
        <div className="px-12 pb-10 pt-4 flex flex-col items-center">
          <motion.span
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center rounded-full"
            initial={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.45, type: "spring", bounce: 0.35 }}
            style={{
              width: 168,
              height: 168,
              background: "rgba(255,255,255,0.18)",
              border: "4px solid rgba(255,255,255,0.38)",
              color: "#FFFFFF",
              marginBottom: 26,
            }}
          >
            <Trash2 size={84} strokeWidth={2} />
          </motion.span>
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="font-extrabold text-center"
            initial={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            style={{
              color: "#FFFFFF",
              fontSize: 66,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            The bin is full
          </motion.h1>
        </div>
        <div style={{ marginBottom: -1 }}>
          <WaveDivider color="#F6FBF7" />
        </div>
      </div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-12 pt-6 pb-10"
        initial={{ opacity: 0, y: 14 }}
        style={{ gap: 24 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <p
          className="text-center"
          style={{ color: "#3D5A49", fontSize: 30, lineHeight: 1.45 }}
        >
          Thanks for recycling — we just can&apos;t take another bottle right
          now. Our team has been notified and will empty it soon.
        </p>

        <div
          style={{
            background: "#FFFBEB",
            border: "2px solid #FDE68A",
            borderRadius: 26,
            padding: "26px 30px",
          }}
        >
          <p style={{ color: "#7C4A02", fontSize: 24, lineHeight: 1.5 }}>
            Please take your bottle back with you and try again later. No
            credits were deducted, and nothing was charged to your account.
          </p>
        </div>

        {/* A real next action — charging still works on existing credits, so
            this is not a dead end for a user who already has a balance. */}
        <button
          className="w-full flex items-center justify-center font-extrabold transition-transform active:scale-[0.98]"
          style={{
            background: "#16A34A",
            color: "#FFFFFF",
            height: 116,
            borderRadius: 58,
            fontSize: 34,
            gap: 16,
            boxShadow: "0 10px 30px rgba(15,122,61,0.26)",
          }}
          onClick={() => router.push("/session/charging")}
        >
          <Zap size={36} strokeWidth={2.75} />
          Charge with my credits
        </button>

        <button
          className="w-full flex items-center justify-center transition-transform active:scale-[0.98]"
          style={{
            height: 92,
            borderRadius: 46,
            border: "3px solid #0F7A3D",
            color: "#0F7A3D",
            fontSize: 28,
            fontWeight: 700,
            gap: 14,
          }}
          onClick={() => router.push("/session")}
        >
          <ArrowLeft size={30} strokeWidth={2.75} />
          Back to menu
        </button>
      </motion.div>
    </div>
  );
}
