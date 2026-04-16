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

  const [phase, setPhase] = useState<Phase>("waiting");
  const [attempt, setAttempt] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Waiting for bottle…");
  const [credits, setCredits] = useState(0);
  const [binPending, setBinPending] = useState(false);

  // Keep phaseRef in sync with phase state
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ── Camera init ────────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
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

  // ── Capture a JPEG frame from the camera ───────────────────────────────────
  const captureFrame = useCallback(async (): Promise<Blob> => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;

    // Bug fix: ensure the video has produced at least one frame before drawing.
    // readyState < 2 (HAVE_CURRENT_DATA) means the stream hasn't started yet
    // → canvas.drawImage would produce a black frame that YOLO cannot detect.
    if (video.readyState < 2) {
      throw new Error("Camera not ready");
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob returned null"))),
        "image/jpeg",
        0.9,
      ),
    );
  }, []);

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
        const blob = await captureFrame();

        result = await detectBottle(blob);
      } catch {
        setStatusMsg(`Attempt ${i} failed — retrying`);
        continue;
      }

      if (result.detected && result.confidence >= 0.5) {
        // ── AI Approved ──────────────────────────────────────────────────────
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
  }, [captureFrame]);

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
        setBinPending(false);

        if (event.confirmed) {
          const awarded = event.credits_awarded ?? 0;
          setCredits(awarded);
          setPhase("bin_confirmed");
          setStatusMsg(`Bottle received! +${awarded} credits earned.`);

          setTimeout(() => {
            sessionStorage.setItem(
              "lastDeposit",
              JSON.stringify({ credits_awarded: awarded }),
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
    <div className="flex flex-col flex-1 page-enter">
      <KioskHeader showAccount />
      <canvas ref={canvasRef} className="hidden" />
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />

      <div className="flex-1 flex flex-col items-center px-6 pt-8 gap-6">
        {/* Status card */}
        <div
          className="glass-white rounded-3xl p-7 w-full max-w-sm shadow-xl flex flex-col items-center gap-5 page-scale"
          style={{ animationDelay: "0.1s" }}
        >
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
            style={{
              background: phaseColor[phase],
              border: `2px solid ${phaseColor[phase].replace("0.2", "0.4").replace("0.15", "0.3").replace("0.3", "0.5")}`,
            }}
          >
            <span className={isActive ? "breathe-anim" : "float-anim"}>
              {phaseIcon[phase]}
            </span>
          </div>

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

            {phase === "scanning" && (
              <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-teal-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(attempt / MAX_RETRIES) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mode badge */}
        <div
          className={`px-4 py-2 rounded-full text-sm font-semibold page-fade ${mode === "charge" ? "glass-amber" : "glass-green"}`}
          style={{ animationDelay: "0.2s" }}
        >
          {mode === "charge" ? "⚡ Charge mode" : "💳 Credit mode"}
        </div>

        {/* Manual scan button — only shown while waiting (fallback if SSE missed) */}
        {phase === "waiting" && (
          <button
            className="glass-btn-primary w-full max-w-sm py-5 rounded-3xl text-lg font-extrabold transition-all active:scale-95 page-fade"
            style={{ animationDelay: "0.25s" }}
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

      <div className="px-6 pb-8">
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
