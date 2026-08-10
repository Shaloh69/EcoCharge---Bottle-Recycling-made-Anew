"use client";
import { useRef, useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import {
  detectBottle,
  kioskApi,
  openKioskSSE,
  session,
  type DetectionResult,
  type KioskSSEEvent,
} from "@/lib/api";
import { useSuspendIdle } from "@/lib/idle-suspend";

const KIOSK_ID = parseInt(process.env.NEXT_PUBLIC_KIOSK_ID ?? "1");
const MAX_RETRIES = 6;
const SCAN_INTERVAL_MS = 2000; // matches BOTTLE_SCAN_INTERVAL_MS in firmware

type Phase =
  | "waiting" // idle — watching for bottle at entrance
  | "scanning" // bottle detected — running scan loop
  | "approved" // AI passed — waiting for bin confirmation
  | "bin_confirmed" // bin sensor fired — credits awarded
  | "rejected" // AI failed all retries OR bin timeout
  | "error";

function DepositContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") ?? "charge";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanActive = useRef(false); // prevents overlapping scan loops

  // phaseRef mirrors phase state so SSE handler always sees current value
  // without needing to be in the useEffect dependency array (avoids reconnects)
  const phaseRef = useRef<Phase>("waiting");
  const lastResultRef = useRef<DetectionResult | null>(null);

  const [phase, setPhase] = useState<Phase>("waiting");
  const [attempt, setAttempt] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Waiting for bottle…");
  const [credits, setCredits] = useState(0);
  const [binPending, setBinPending] = useState(false);

  // Suspend the kiosk-wide idle timer during SCANNING and bin-confirmation
  // (approved, while binPending is true) — docs/planning/02-design-mandate.md
  // SS4.2: a user is *supposed* to stand still and not touch the screen
  // during these states, which is exactly when a generic activity-based
  // idle timer would otherwise misfire.
  useSuspendIdle(phase === "scanning" || (phase === "approved" && binPending));

  // Keep phaseRef in sync with phase state
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ── Camera init ────────────────────────────────────────────────────────────
  // Explicit resolution constraints — docs/planning/07-ai-detection-improvements.md
  // flagged unconstrained getUserMedia as a real contributor to inconsistent
  // detection (some cameras default to a low resolution that loses detail
  // before the frame ever reaches YOLO). `ideal` degrades gracefully instead
  // of throwing OverconstrainedError on cameras that can't hit 1280x720.
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setStatusMsg("Camera unavailable"));

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  // ── Capture a single JPEG frame from the camera ────────────────────────────
  const captureFrame = useCallback(async (): Promise<Blob> => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;

    // Bug fix: ensure the video has produced at least one frame before drawing.
    // readyState < 2 (HAVE_CURRENT_DATA) means the stream hasn't started yet
    // → canvas.drawImage would produce a black frame that YOLO cannot detect.
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      throw new Error("Camera not ready");
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob returned null"))),
        "image/jpeg",
        0.9,
      ),
    );
  }, []);

  // ── Sharpness score (variance of Laplacian, the standard cheap blur metric) ──
  // Run on a small downsampled grayscale copy so this stays fast — we only
  // need a relative ranking between a handful of frames, not a precise score.
  const sharpnessScore = useCallback((blob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = 160;
        const h = Math.round((img.height / img.width) * w) || 90;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const gray = new Float32Array(w * h);
        const { data } = ctx.getImageData(0, 0, w, h);
        for (let i = 0; i < w * h; i++) {
          const o = i * 4;
          gray[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
        }
        let sum = 0;
        let sumSq = 0;
        let n = 0;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            const lap =
              4 * gray[i] -
              gray[i - 1] -
              gray[i + 1] -
              gray[i - w] -
              gray[i + w];
            sum += lap;
            sumSq += lap * lap;
            n++;
          }
        }
        const mean = sum / n;
        resolve(sumSq / n - mean * mean); // variance
      };
      img.onerror = () => resolve(0);
      img.src = URL.createObjectURL(blob);
    });
  }, []);

  // ── Best-of-N capture — mitigates motion blur from the conveyor's nudge ────
  // docs/planning/07-ai-detection-improvements.md flagged single-frame capture
  // as a real reliability gap: the belt is physically moving during the nudge
  // window, so any one frame can land mid-motion. Grabs N frames a short beat
  // apart (all local, no AI calls yet) and sends only the sharpest one —
  // cheaper than calling the AI server N times per attempt.
  const captureBestFrame = useCallback(
    async (n = 3, spacingMs = 100): Promise<Blob> => {
      const frames: Blob[] = [];
      for (let i = 0; i < n; i++) {
        frames.push(await captureFrame());
        if (i < n - 1) await new Promise((r) => setTimeout(r, spacingMs));
      }
      const scores = await Promise.all(frames.map(sharpnessScore));
      let bestIdx = 0;
      for (let i = 1; i < scores.length; i++) {
        if (scores[i] > scores[bestIdx]) bestIdx = i;
      }
      console.log(
        `[Stage 1] Best-of-${n} frame selected: #${bestIdx + 1} (scores=${scores.map((s) => s.toFixed(1)).join(",")})`,
      );

      return frames[bestIdx];
    },
    [captureFrame, sharpnessScore],
  );

  // ── Scan loop — up to MAX_RETRIES attempts ─────────────────────────────────
  // The firmware auto-nudges the belt every BOTTLE_SCAN_INTERVAL_MS.
  // We wait the same interval so each attempt sees a fresh bottle position.
  const runScanLoop = useCallback(async () => {
    if (scanActive.current) return;
    scanActive.current = true;

    const sid = session.get();

    if (!sid) {
      setPhase("error");
      setStatusMsg("No session");
      scanActive.current = false;

      return;
    }

    let result: DetectionResult | null = null;

    for (let i = 1; i <= MAX_RETRIES; i++) {
      setAttempt(i);
      setStatusMsg(`Scanning… attempt ${i} of ${MAX_RETRIES}`);

      // Wait for firmware nudge cycle before capturing
      await new Promise((r) => setTimeout(r, SCAN_INTERVAL_MS));

      try {
        const blob = await captureBestFrame();
        console.log(`[Stage 1] Frame captured — ${blob.size} bytes, attempt ${i}/${MAX_RETRIES}`);

        result = await detectBottle(blob, sid);
        console.log(`[Stage 3→kiosk] Detection result — detected=${result.detected} conf=${result.confidence} brand=${result.brand} vol=${result.volume_ml}mL`);
      } catch (err) {
        console.warn(`[Stage 1] Attempt ${i} failed — ${(err as Error).message}`);
        setStatusMsg(`Attempt ${i} failed — retrying`);
        continue;
      }

      if (result.detected && result.confidence >= 0.5) {
        // ── AI Approved ──────────────────────────────────────────────────────
        lastResultRef.current = result;
        console.log(`[Stage 4] Bottle approved — sending to server | brand=${result.brand} vol=${result.volume_ml}mL conf=${result.confidence}`);
        setPhase("approved");
        setBinPending(true);
        setStatusMsg("Bottle approved! Dropping into bin…");

        try {
          await kioskApi.approveBottle(
            parseInt(sid),
            result.brand ?? null,
            result.volume_ml ?? null,
            result.condition ?? null,
            result.confidence,
          );
        } catch {
          setPhase("error");
          setStatusMsg("Failed to contact server");
        }

        scanActive.current = false;

        return; // SSE listener handles the rest
      }
    }

    // ── All retries exhausted — Rejected ─────────────────────────────────────
    setPhase("rejected");
    setStatusMsg("Bottle not recognised. Please try again.");

    try {
      await kioskApi.rejectBottle(parseInt(sid));
    } catch {
      /* best-effort */
    }

    scanActive.current = false;
  }, [captureBestFrame]);

  // ── SSE listener — responds to bottle events from ESP32 telemetry ──────────
  // Bug fix: phase is NOT in the dependency array.
  // Instead we read phaseRef.current inside the handler so we always see the
  // current phase without tearing down and rebuilding the SSE connection on
  // every setPhase() call (which would cause bottleAtEntrance/bottleInBin
  // events to be missed during the brief reconnect window).
  useEffect(() => {
    const unsubscribe = openKioskSSE(KIOSK_ID, (event: KioskSSEEvent) => {
      // bottleAtEntrance — auto-trigger scan when ESP32 detects bottle
      if (event.bottleAtEntrance === true && phaseRef.current === "waiting") {
        setPhase("scanning");
        setStatusMsg("Bottle detected! Starting scan…");
        runScanLoop();

        return;
      }

      // bottleInBin — bin sensor confirmation from ESP32
      if (event.type === "bottleInBin") {
        console.log(`[Stage 6→kiosk] SSE bottleInBin received — confirmed=${event.confirmed} credits=${event.credits_awarded ?? 0}`);
        setBinPending(false);

        if (event.confirmed) {
          const awarded = event.credits_awarded ?? 0;
          setCredits(awarded);
          setPhase("bin_confirmed");
          setStatusMsg(`Bottle received! +${awarded} credits earned.`);

          setTimeout(() => {
            const ai = lastResultRef.current;
            sessionStorage.setItem(
              "lastDeposit",
              JSON.stringify({
                credits_awarded: awarded,
                brand: ai?.brand ?? null,
                volume_ml: ai?.volume_ml ?? null,
              }),
            );
            router.push(`/session/result?mode=${mode}&status=accepted`);
          }, 2500);
        } else {
          setPhase("rejected");
          setStatusMsg("Bottle not detected in bin. No credits awarded.");
          setTimeout(() => {
            router.push(`/session/result?mode=${mode}&status=rejected`);
          }, 2500);
        }
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, router, runScanLoop]);

  // ── Bin confirmation timeout — fallback if SSE misses the event ────────────
  useEffect(() => {
    if (!binPending) return;
    const timer = setTimeout(() => {
      if (binPending) {
        setPhase("rejected");
        setBinPending(false);
        setStatusMsg("Bin confirmation timed out. No credits awarded.");
        setTimeout(
          () => router.push(`/session/result?mode=${mode}&status=rejected`),
          2000,
        );
      }
    }, 12000); // 10s firmware timeout + 2s SSE travel buffer

    return () => clearTimeout(timer);
  }, [binPending, mode, router]);

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const phaseIcon: Record<Phase, string> = {
    waiting: "🍶",
    scanning: "🔍",
    approved: "⬇️",
    bin_confirmed: "✅",
    rejected: "❌",
    error: "⚠️",
  };

  const phaseColor: Record<Phase, string> = {
    waiting: "rgba(76,175,80,0.15)",
    scanning: "rgba(20,184,166,0.2)",
    approved: "rgba(59,130,246,0.2)",
    bin_confirmed: "rgba(76,175,80,0.3)",
    rejected: "rgba(239,68,68,0.2)",
    error: "rgba(245,158,11,0.2)",
  };

  const isActive = phase === "scanning" || phase === "approved";

  return (
    <div className="flex flex-col flex-1">
      <KioskHeader showAccount />
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex-1 flex flex-col items-center px-8 pt-8 gap-6">
        {/* Camera preview — must be visible so browser decodes frames */}
        <div className="relative w-full rounded-3xl overflow-hidden shadow-xl bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Phase overlay badge */}
          <div
            className="absolute bottom-3 left-3 right-3 rounded-2xl px-4 py-2 flex items-center gap-2"
            style={{ background: phaseColor[phase], backdropFilter: "blur(8px)" }}
          >
            <span className={isActive ? "breathe-anim" : ""}>{phaseIcon[phase]}</span>
            <p className="text-gray-800 text-sm font-bold truncate">
              {phase === "waiting" && "Insert your plastic bottle"}
              {phase === "scanning" && `Scanning — attempt ${attempt}/${MAX_RETRIES}`}
              {phase === "approved" && "Dropping into bin…"}
              {phase === "bin_confirmed" && `+${credits} credits earned!`}
              {phase === "rejected" && "Bottle rejected"}
              {phase === "error" && "Something went wrong"}
            </p>
          </div>
          {phase === "scanning" && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
              <div
                className="bg-teal-400 h-1 transition-all duration-500"
                style={{ width: `${(attempt / MAX_RETRIES) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Status card */}
        <div
          className="glass-white rounded-3xl p-7 w-full shadow-xl flex flex-col items-center gap-5"
        >
          <div className="text-center">
            <p className="text-gray-800 text-xl font-bold">
              {phase === "waiting" && "Insert your plastic bottle"}
              {phase === "scanning" &&
                `Scanning — attempt ${attempt}/${MAX_RETRIES}`}
              {phase === "approved" && "Dropping into bin…"}
              {phase === "bin_confirmed" && `+${credits} credits earned!`}
              {phase === "rejected" && "Bottle rejected"}
              {phase === "error" && "Something went wrong"}
            </p>
            <p className="text-gray-400 text-sm mt-1">{statusMsg}</p>
          </div>
        </div>

        {/* Mode badge */}
        <div
          className={`px-4 py-2 rounded-full text-sm font-semibold ${mode === "charge" ? "glass-amber" : "glass-green"}`}
        >
          {mode === "charge" ? "⚡ Charge mode" : "💳 Credit mode"}
        </div>

        {/* Manual scan button — only shown while waiting (fallback if SSE missed) */}
        {phase === "waiting" && (
          <button
            className="glass-btn-primary w-full py-6 rounded-3xl text-xl font-extrabold transition-all active:scale-95"
            onClick={() => {
              setPhase("scanning");
              setStatusMsg("Starting scan…");
              runScanLoop();
            }}
          >
            Scan Bottle Manually
          </button>
        )}
      </div>

      <div className="px-8 pb-8 pt-4">
        <BackButton href="/session" />
      </div>
    </div>
  );
}

export default function DepositPage() {
  return (
    <Suspense>
      <DepositContent />
    </Suspense>
  );
}
