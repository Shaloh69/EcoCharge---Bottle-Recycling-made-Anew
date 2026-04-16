"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "checking" | "ok" | "fail";

interface CheckResult {
  label: string;
  status: Status;
  detail: string;
}

const CHECKS: { key: string; label: string; endpoint: string }[] = [
  {
    key: "backend",
    label: "Backend API",
    endpoint: "/api/health-backend",
  },
  {
    key: "ai",
    label: "AI Inference Server",
    endpoint: "/api/health-ai",
  },
];

export default function DiagPage() {
  const router = useRouter();
  const [results, setResults] = useState<CheckResult[]>(
    CHECKS.map((c) => ({ label: c.label, status: "idle", detail: "—" })),
  );
  const [running, setRunning] = useState(false);

  const runChecks = useCallback(async () => {
    setRunning(true);
    setResults(
      CHECKS.map((c) => ({ label: c.label, status: "checking", detail: "Testing…" })),
    );

    const next = await Promise.all(
      CHECKS.map(async (c) => {
        const start = Date.now();
        try {
          const res = await fetch(c.endpoint, { cache: "no-store" });
          const ms = Date.now() - start;
          const data = await res.json();

          if (data.online === false) {
            return {
              label: c.label,
              status: "fail" as Status,
              detail: data.error ?? `Unreachable (${ms} ms)`,
            };
          }

          const extra =
            data.model ? ` · model: ${data.model}` : "";
          return {
            label: c.label,
            status: "ok" as Status,
            detail: `Online (${ms} ms)${extra}`,
          };
        } catch (e: unknown) {
          return {
            label: c.label,
            status: "fail" as Status,
            detail: e instanceof Error ? e.message : "Network error",
          };
        }
      }),
    );

    setResults(next);
    setRunning(false);
  }, []);

  const allOk  = results.every((r) => r.status === "ok");
  const anyFail = results.some((r) => r.status === "fail");
  const anyIdle = results.every((r) => r.status === "idle");

  const statusIcon: Record<Status, string> = {
    idle:     "○",
    checking: "◌",
    ok:       "✓",
    fail:     "✗",
  };

  const statusColor: Record<Status, string> = {
    idle:     "rgba(255,255,255,0.2)",
    checking: "rgba(250,204,21,0.3)",
    ok:       "rgba(74,222,128,0.25)",
    fail:     "rgba(248,113,113,0.25)",
  };

  const statusBorder: Record<Status, string> = {
    idle:     "rgba(255,255,255,0.1)",
    checking: "rgba(250,204,21,0.4)",
    ok:       "rgba(74,222,128,0.45)",
    fail:     "rgba(248,113,113,0.45)",
  };

  const statusText: Record<Status, string> = {
    idle:     "text-white/40",
    checking: "text-yellow-300",
    ok:       "text-green-400",
    fail:     "text-red-400",
  };

  return (
    <div className="flex flex-col flex-1 px-6 py-8 page-enter">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          className="text-white/40 text-sm active:text-white/70"
          onClick={() => router.back()}
        >
          ← Back
        </button>
        <div className="flex-1" />
        <span className="text-white/25 text-[10px] tracking-widest uppercase">
          System Diagnostics
        </span>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-white text-2xl font-extrabold">Connection Test</h1>
        <p className="text-white/40 text-sm mt-1">
          Verifies backend and AI server reachability.
        </p>
      </div>

      {/* Check cards */}
      <div className="flex flex-col gap-3 flex-1">
        {results.map((r) => (
          <div
            key={r.label}
            className="rounded-2xl px-5 py-4 flex items-center gap-4 transition-all duration-300"
            style={{
              background: statusColor[r.status],
              border: `1.5px solid ${statusBorder[r.status]}`,
              backdropFilter: "blur(16px)",
            }}
          >
            <span
              className={`text-xl font-bold tabular-nums ${statusText[r.status]} ${r.status === "checking" ? "animate-pulse" : ""}`}
            >
              {statusIcon[r.status]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">{r.label}</p>
              <p className={`text-xs mt-0.5 truncate ${statusText[r.status]}`}>
                {r.detail}
              </p>
            </div>
          </div>
        ))}

        {/* Summary */}
        {!anyIdle && !running && (
          <div
            className={`rounded-2xl px-5 py-4 text-center mt-2 ${
              allOk ? "glass-green" : anyFail ? "" : "glass"
            }`}
            style={
              anyFail
                ? {
                    background: "rgba(248,113,113,0.15)",
                    border: "1.5px solid rgba(248,113,113,0.3)",
                    backdropFilter: "blur(16px)",
                  }
                : {}
            }
          >
            <p
              className={`font-extrabold text-base ${
                allOk ? "text-green-300" : "text-red-300"
              }`}
            >
              {allOk ? "All systems online ✓" : "One or more checks failed"}
            </p>
            {anyFail && (
              <p className="text-white/40 text-xs mt-1">
                Check your network or server configuration.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Run button */}
      <div className="pt-6 pb-2 flex flex-col gap-3">
        <button
          disabled={running}
          className={`glass-btn-primary w-full py-5 rounded-3xl font-extrabold text-lg transition-all active:scale-95 ${
            running ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={runChecks}
        >
          {running ? "Testing…" : anyIdle ? "Run Connection Test" : "Run Again"}
        </button>
        <button
          className="glass-btn-secondary w-full py-4 rounded-3xl font-bold text-base transition-all active:scale-95"
          onClick={() => router.push("/")}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
