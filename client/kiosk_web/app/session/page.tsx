"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, CreditCard, Recycle, Zap } from "lucide-react";

import { KioskHeader } from "@/components/kiosk/KioskHeader";

/**
 * Mode select — full redo, 2026-08-11.
 *
 * Screenshotted at the real 1080x1920 after the shell width fix. Problems, all
 * real: the two option tiles carried emoji inside white rounded squares (SS1's
 * banned icon-in-rounded-square, and emoji rather than the lucide set used
 * everywhere else on this surface), the content occupied a band in the middle
 * with roughly 1300px of dead space above and below it, and the back control
 * had fallen below the fold entirely — on a kiosk, "back" being unreachable is
 * a dead end, which SS4 rules out ("zero dead ends").
 */
const OPTIONS = [
  {
    href: "/session/deposit?mode=charge",
    icon: Zap,
    label: "Charge",
    sub: "Use your credits to charge your phone",
    bg: "#FFFBEB",
    border: "#FDE68A",
    accent: "#B45309",
    iconBg: "#FDE68A",
  },
  {
    href: "/session/deposit?mode=credit",
    icon: CreditCard,
    label: "Credits",
    sub: "Check your balance or add more",
    bg: "#DCFCE7",
    border: "#BBF7D0",
    accent: "#15803D",
    iconBg: "#BBF7D0",
  },
];

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function SessionPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1" style={{ background: "#F6FBF7" }}>
      <KioskHeader showAccount />

      <motion.div
        animate="animate"
        className="flex-1 flex flex-col px-12 pt-10 pb-10"
        initial="initial"
        style={{ gap: 28 }}
        transition={{ staggerChildren: 0.09 }}
      >
        <motion.div transition={{ duration: 0.3 }} variants={item}>
          <p
            className="uppercase"
            style={{
              color: "#7C9587",
              fontSize: 19,
              letterSpacing: "0.2em",
              marginBottom: 10,
            }}
          >
            What would you like to do?
          </p>
          <h1
            className="font-extrabold"
            style={{
              color: "#14231B",
              fontSize: 68,
              letterSpacing: "-0.03em",
              lineHeight: 1.02,
            }}
          >
            Select Mode
          </h1>
        </motion.div>

        {/* Options — tall enough to be unmissable across a room */}
        <motion.div
          className="flex flex-col"
          style={{ gap: 22 }}
          transition={{ duration: 0.35, type: "spring", bounce: 0.2 }}
          variants={item}
        >
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;

            return (
              <button
                key={opt.href}
                className="w-full flex items-center text-left transition-transform active:scale-[0.98]"
                style={{
                  background: opt.bg,
                  border: `3px solid ${opt.border}`,
                  borderRadius: 34,
                  padding: "38px 34px",
                  gap: 30,
                  minHeight: 196,
                }}
                onClick={() => router.push(opt.href)}
              >
                {/* Icon sits on a soft disc, not a bordered white square tile */}
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 104,
                    height: 104,
                    background: opt.iconBg,
                    color: opt.accent,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={50} strokeWidth={2.5} />
                </span>
                <span className="flex-1">
                  <span
                    className="block font-extrabold"
                    style={{
                      color: "#14231B",
                      fontSize: 52,
                      lineHeight: 1.05,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {opt.label}
                  </span>
                  <span
                    className="block"
                    style={{ color: "#4A6B58", fontSize: 24, marginTop: 8 }}
                  >
                    {opt.sub}
                  </span>
                </span>
                <ChevronRight
                  color={opt.accent}
                  size={44}
                  strokeWidth={3}
                  style={{ flexShrink: 0 }}
                />
              </button>
            );
          })}
        </motion.div>

        {/* Bottle prompt — real instruction, not a decorative tile */}
        <motion.div
          className="flex items-center"
          style={{
            background: "#FFFFFF",
            border: "2px solid #E5EFE8",
            borderRadius: 30,
            padding: "28px 32px",
            gap: 24,
          }}
          transition={{ duration: 0.3 }}
          variants={item}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{
              width: 82,
              height: 82,
              background: "#DCFCE7",
              color: "#15803D",
              flexShrink: 0,
            }}
          >
            <Recycle size={40} strokeWidth={2.5} />
          </span>
          <span>
            <span
              className="block font-bold"
              style={{ color: "#14231B", fontSize: 32 }}
            >
              Have a bottle?
            </span>
            <span
              className="block"
              style={{ color: "#4A6B58", fontSize: 23, marginTop: 4 }}
            >
              Drop it in the slot above to earn credits.
            </span>
          </span>
        </motion.div>

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
          onClick={() => router.push("/auth/linked")}
        >
          <ArrowLeft size={26} strokeWidth={2.5} />
          Back
        </motion.button>
      </motion.div>
    </div>
  );
}
