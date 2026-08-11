"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Recycle, Zap } from "lucide-react";

import { FallingLeaves } from "@/components/kiosk/FallingLeaves";
import { WaveDivider } from "@/components/kiosk/WaveDivider";

const item = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

/**
 * Kiosk attract screen — full redo, 2026-08-11.
 *
 * The previous version was rebuilt against a real screenshot at the kiosk's
 * true 1080x1920 resolution and failed on four counts, all of them real:
 *
 * 1. It filled roughly 40% of the screen. On a 1920px-tall fixed display that
 *    left two enormous dead bands, which is the single most obvious way a
 *    kiosk screen reads as "a phone page stretched".
 * 2. The three "PET·HDPE / 4 Chargers / Go Green" tiles were literally the
 *    centered-hero-three-cards layout SS1 bans, and their icons were emoji.
 * 3. Body copy sat at ~16px against SS4's explicit >= 20px floor (this screen is
 *    read from ~2m away).
 * 4. The mascot was a green orb with a bottle emoji in it, while the real,
 *    credited mascot art has been sitting unused in public/mascot/.
 *
 * The direction now is a two-band composition that uses the whole display:
 * a solid deep-green hero carrying the mascot and the promise, cut by the
 * kiosk's signature wave divider, over a white action band. This is the one
 * surface the wave motif belongs to (SS2), and it makes the screen unmistakably
 * the kiosk rather than a scaled-down web page.
 */
export default function SplashPage() {
  const router = useRouter();

  return (
    <motion.div
      animate="animate"
      className="flex flex-col flex-1 relative overflow-hidden"
      initial="initial"
      transition={{ staggerChildren: 0.09 }}
      style={{ background: "#FFFFFF" }}
    >
      {/* ── Hero band: solid deep forest green, fills the top ~62% ───────── */}
      <div
        className="relative flex flex-col"
        style={{ background: "#0F7A3D", flex: "0 0 62%" }}
      >
        <FallingLeaves />

        {/* Wordmark */}
        <motion.div
          className="flex items-center gap-4 px-12 pt-12 relative z-10"
          transition={{ duration: 0.3 }}
          variants={item}
        >
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 62,
              height: 62,
              background: "rgba(255,255,255,0.16)",
              border: "2px solid rgba(255,255,255,0.30)",
            }}
          >
            <Zap color="#FFFFFF" size={32} strokeWidth={2.5} />
          </div>
          <div>
            <p
              className="font-extrabold leading-none"
              style={{ color: "#FFFFFF", fontSize: 40, letterSpacing: "-0.02em" }}
            >
              EcoCharge
            </p>
            <p
              className="uppercase mt-2"
              style={{
                color: "rgba(255,255,255,0.72)",
                fontSize: 15,
                letterSpacing: "0.24em",
              }}
            >
              Kiosk Station
            </p>
          </div>
        </motion.div>

        {/* Mascot + promise */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-12">
          <motion.div
            transition={{ duration: 0.5, type: "spring", bounce: 0.32 }}
            variants={item}
            style={{ position: "relative" }}
          >
            <Image
              alt="EcoCharge mascot holding a plastic bottle"
              className="select-none"
              height={520}
              priority
              src="/mascot/attract-hero.png"
              style={{ height: "auto", width: "auto", maxHeight: 520 }}
              width={400}
            />
          </motion.div>

          <motion.h1
            className="font-extrabold text-center"
            transition={{ duration: 0.3 }}
            variants={item}
            style={{
              color: "#FFFFFF",
              fontSize: 78,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              marginTop: 12,
            }}
          >
            Recycle. Charge.
          </motion.h1>
        </div>

        {/* Signature wave cutting hero from body */}
        <div style={{ position: "relative", zIndex: 10, marginBottom: -1 }}>
          <WaveDivider animated color="#FFFFFF" />
        </div>
      </div>

      {/* ── Action band ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between px-12 pb-12 pt-4">
        <motion.p
          className="text-center"
          transition={{ duration: 0.3 }}
          variants={item}
          style={{
            color: "#3D5A49",
            fontSize: 27,
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          Drop a plastic bottle, earn credits,
          <br />
          and charge your phone — free.
        </motion.p>

        {/* The real three-step promise, as a horizontal rail rather than three
            cards — same information, none of the banned tile grid. */}
        <motion.div
          className="flex items-center justify-center"
          transition={{ duration: 0.3 }}
          variants={item}
          style={{ gap: 20 }}
        >
          {[
            { n: "1", label: "Scan", icon: <Recycle size={24} /> },
            { n: "2", label: "Deposit", icon: null },
            { n: "3", label: "Charge", icon: <Zap size={24} /> },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center" style={{ gap: 20 }}>
              <div className="flex items-center" style={{ gap: 12 }}>
                <span
                  className="flex items-center justify-center rounded-full font-extrabold"
                  style={{
                    width: 46,
                    height: 46,
                    background: "#DCFCE7",
                    color: "#0F7A3D",
                    fontSize: 21,
                  }}
                >
                  {s.n}
                </span>
                <span
                  style={{ color: "#14231B", fontSize: 25, fontWeight: 700 }}
                >
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 42,
                    height: 3,
                    background: "#D6E7DC",
                    borderRadius: 2,
                  }}
                />
              )}
            </div>
          ))}
        </motion.div>

        {/* Primary action — far above SS4's 64px floor, because on a kiosk this
            is the only thing a first-time user needs to find. */}
        <motion.div
          className="flex flex-col"
          style={{ gap: 18 }}
          transition={{ duration: 0.3 }}
          variants={item}
        >
          <button
            className="w-full flex items-center justify-center font-extrabold transition-transform active:scale-[0.98]"
            style={{
              background: "#16A34A",
              color: "#FFFFFF",
              height: 124,
              borderRadius: 62,
              fontSize: 40,
              letterSpacing: "-0.01em",
              gap: 18,
              boxShadow: "0 10px 30px rgba(15,122,61,0.28)",
            }}
            onClick={() => router.push("/auth")}
          >
            Touch to Start
            <ArrowRight size={40} strokeWidth={3} />
          </button>

          <button
            className="w-full transition-colors"
            style={{
              // Was #7C9587 on #F6FBF7 at 12px — genuinely hard to read, and
              // this is the button a technician needs on a machine that is
              // misbehaving. Real contrast, real size.
              color: "#4A6B58",
              fontSize: 17,
              letterSpacing: "0.18em",
              height: 60,
              borderRadius: 30,
              border: "2px solid #D6E7DC",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
            onClick={() => router.push("/diag")}
          >
            System Check
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
