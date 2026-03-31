"use client";
import { useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BackButton } from "@/components/kiosk/BackButton";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import {
  detectBottle,
  kioskApi,
  session,
  type DetectionResult,
} from "@/lib/api";

function DepositContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") ?? "charge";
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleScan = async () => {
    setScanning(true);
    setError("");
    try {
      let imageBlob: Blob;

      if (videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d")!;

        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
        ctx.drawImage(videoRef.current, 0, 0);
        imageBlob = await new Promise<Blob>((res) =>
          canvasRef.current!.toBlob((b) => res(b!), "image/jpeg", 0.9),
        );
      } else {
        throw new Error("Camera not available");
      }

      const result: DetectionResult = await detectBottle(imageBlob);

      if (!result.detected || result.confidence < 0.5) {
        router.push(`/session/result?mode=${mode}&status=rejected`);

        return;
      }

      const sid = session.get();

      if (sid) {
        await kioskApi.recordDeposit(
          parseInt(sid),
          result.brand,
          result.volume_ml,
          result.condition,
          result.confidence,
        );
      }

      sessionStorage.setItem(
        "lastDeposit",
        JSON.stringify({
          brand: result.brand,
          volume_ml: result.volume_ml,
          condition: result.condition,
          confidence: result.confidence,
        }),
      );
      router.push(`/session/result?mode=${mode}&status=accepted`);
    } catch (e) {
      setError((e as Error).message ?? "Scan failed");
      setScanning(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen page-enter">
      <KioskHeader showAccount />
      <canvas ref={canvasRef} className="hidden" />
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />

      <div className="flex-1 flex flex-col items-center px-6 pt-8 gap-6">
        {/* Scan card */}
        <div
          className="glass-white rounded-3xl p-7 w-full max-w-sm shadow-xl flex flex-col items-center gap-5 page-scale"
          style={{ animationDelay: "0.1s" }}
        >
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
            style={{
              background: scanning
                ? "linear-gradient(135deg, rgba(20,184,166,0.2), rgba(20,184,166,0.05))"
                : "linear-gradient(135deg, rgba(76,175,80,0.15), rgba(76,175,80,0.04))",
              border: scanning
                ? "2px solid rgba(20,184,166,0.4)"
                : "2px solid rgba(76,175,80,0.3)",
            }}
          >
            <span className={scanning ? "breathe-anim" : "float-anim"}>
              {scanning ? "🔍" : "🍶"}
            </span>
          </div>

          <div className="text-center">
            <p className="text-gray-800 text-xl font-bold">
              {scanning ? "Scanning bottle…" : "Insert your plastic bottle"}
            </p>
            {!scanning && (
              <p className="text-gray-400 text-sm mt-1">
                Place bottle in the slot above the camera
              </p>
            )}
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        </div>

        {/* Mode badge */}
        <div
          className={`px-4 py-2 rounded-full text-sm font-semibold page-fade ${mode === "charge" ? "glass-amber" : "glass-green"}`}
          style={{ animationDelay: "0.2s" }}
        >
          {mode === "charge" ? "⚡ Charge mode" : "💳 Credit mode"}
        </div>

        {/* Scan button */}
        <button
          className="glass-btn-primary w-full max-w-sm py-6 rounded-3xl text-xl font-extrabold transition-all active:scale-95 disabled:opacity-40 page-fade"
          disabled={scanning}
          style={{ animationDelay: "0.25s" }}
          onClick={handleScan}
        >
          {scanning ? "Scanning…" : "Scan Bottle"}
        </button>
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
