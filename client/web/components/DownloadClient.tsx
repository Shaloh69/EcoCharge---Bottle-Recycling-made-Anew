"use client";
import { useRef, useState } from "react";

/**
 * Direct APK download with real fetch-progress, not a bare file link — per
 * the 2026-08-11 app-distribution work item. Tracks real bytes received via
 * the Fetch API's ReadableStream, not a fake/simulated progress bar.
 *
 * Per docs/planning/02-design-mandate.md SS6: no evidence this app is
 * published to any app store, so this stays a direct APK download, not a
 * store-listing link. Repoint if a real store listing ever ships.
 */

type Phase = "idle" | "downloading" | "done" | "error";

const APK_URL = "/downloads/ecocharge.apk";
const APK_VERSION = "1.0.0";

export function DownloadClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [receivedBytes, setReceivedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const [error, setError] = useState("");
  const blobUrlRef = useRef<string | null>(null);

  async function handleDownload() {
    setPhase("downloading");
    setError("");
    setReceivedBytes(0);
    setTotalBytes(null);

    try {
      const res = await fetch(APK_URL);

      if (!res.ok || !res.body) {
        throw new Error(`Server returned ${res.status}`);
      }

      const contentLength = res.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : null;

      setTotalBytes(total);

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      for (;;) {
        const { done, value } = await reader.read();

        if (done) break;
        chunks.push(value);
        received += value.length;
        setReceivedBytes(received);
      }

      const blob = new Blob(chunks as BlobPart[], {
        type: "application/vnd.android.package-archive",
      });
      const blobUrl = URL.createObjectURL(blob);

      blobUrlRef.current = blobUrl;

      const a = document.createElement("a");

      a.href = blobUrl;
      a.download = `ecocharge-${APK_VERSION}.apk`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setPhase("done");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Download failed — please try again.",
      );
      setPhase("error");
    }
  }

  const progressPct =
    totalBytes && totalBytes > 0
      ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100))
      : null;

  return (
    <div className="mt-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
      <p className="font-display text-lg font-bold text-eco-green-800">
        Android · v{APK_VERSION}
      </p>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Not published to the Play Store — this installs the APK directly.
        You&apos;ll need to allow installs from unknown sources on your
        device.
      </p>

      {phase === "idle" || phase === "error" ? (
        <>
          <button
            onClick={handleDownload}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-eco-green-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-eco-green-700"
          >
            Download APK
          </button>
          {phase === "error" && (
            <p className="mt-3 text-xs text-red-600">{error}</p>
          )}
        </>
      ) : phase === "downloading" ? (
        <div className="mt-6">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-eco-green-100">
            <div
              className="h-full rounded-full bg-eco-green-600 transition-[width] duration-150"
              style={{ width: `${progressPct ?? 8}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            {progressPct !== null
              ? `${progressPct}% · ${formatBytes(receivedBytes)} of ${formatBytes(totalBytes ?? 0)}`
              : `${formatBytes(receivedBytes)} downloaded…`}
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-eco-green-100 text-2xl">
            ✓
          </div>
          <p className="mt-4 font-display text-lg font-bold text-eco-green-800">
            Thanks for downloading EcoCharge
          </p>
          <div className="mt-4 space-y-2 text-left text-xs text-[var(--color-muted)]">
            <p>
              <strong>Before you install:</strong> your device will warn you
              this is from an unrecognized developer — that&apos;s expected
              for a direct APK install, not a sign anything is wrong. Open the
              downloaded file and allow the install when prompted.
            </p>
            <p>
              <strong>This is a thesis project</strong> for the University of
              Cebu Lapu-Lapu and Mandaue, not a commercial product — see{" "}
              <a href="/about" className="underline">
                About
              </a>{" "}
              for the full context.
            </p>
            <p>
              The app requires an EcoCharge kiosk nearby to be useful — see{" "}
              <a href="/how-it-works" className="underline">
                how it works
              </a>{" "}
              if you haven&apos;t used one yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
