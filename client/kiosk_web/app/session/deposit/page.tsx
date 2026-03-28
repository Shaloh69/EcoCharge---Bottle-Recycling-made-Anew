"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, Suspense } from "react";
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { BackButton } from "@/components/kiosk/BackButton";
import { detectBottle, kioskApi, session, type DetectionResult } from "@/lib/api";

function DepositContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") || "charge";
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleScan = async () => {
    setScanning(true);
    setError("");
    try {
      // Capture frame from webcam
      let imageBlob: Blob;
      if (videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d")!;
        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
        ctx.drawImage(videoRef.current, 0, 0);
        imageBlob = await new Promise<Blob>(res =>
          canvasRef.current!.toBlob(b => res(b!), "image/jpeg", 0.9)
        );
      } else {
        throw new Error("Camera not available");
      }

      const result: DetectionResult = await detectBottle(imageBlob);

      if (!result.detected || result.confidence < 0.5) {
        router.push(`/session/result?mode=${mode}&status=rejected`);
        return;
      }

      // Record deposit with server
      const sid = session.get();
      if (sid) {
        await kioskApi.recordDeposit(
          parseInt(sid),
          result.brand,
          result.volume_ml,
          result.condition,
          result.confidence
        );
      }

      // Pass result to result page via sessionStorage
      sessionStorage.setItem(
        "lastDeposit",
        JSON.stringify({ brand: result.brand, volume_ml: result.volume_ml, condition: result.condition, confidence: result.confidence })
      );
      router.push(`/session/result?mode=${mode}&status=accepted`);
    } catch (e) {
      setError((e as Error).message ?? "Scan failed");
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1B5E20" }}>
      <KioskHeader showAccount />
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex-1 flex flex-col items-center px-6 pt-6 gap-6">
        {/* Hidden video element for webcam capture */}
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />

        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-lg flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl">
            {scanning ? "🔍" : "🍶"}
          </div>
          <p className="text-gray-800 text-xl font-semibold text-center">
            {scanning ? "Scanning bottle..." : "Insert your plastic bottle"}
          </p>
          {!scanning && (
            <p className="text-gray-500 text-sm text-center">
              Place bottle in the slot above the camera
            </p>
          )}
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
        </div>

        <button
          disabled={scanning}
          onClick={handleScan}
          className="w-full max-w-sm py-5 rounded-2xl bg-white text-green-800 text-xl font-bold shadow-xl hover:bg-green-50 active:scale-95 transition-all disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Scan Bottle"}
        </button>
      </div>
      <div className="px-6 pb-6">
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
