"use client";
import { useEffect, useState } from "react";

export type AiStatus = "checking" | "online" | "offline";

const POLL_INTERVAL_MS = 60_000; // 1 minute

/* eslint-disable no-console */
async function ping(): Promise<AiStatus> {
  console.log("[AI Health] Ping sent →", new Date().toLocaleTimeString());
  let res: Response;

  try {
    res = await fetch("/api/health-ai", { cache: "no-store" });
  } catch (err) {
    console.warn("[AI Health] Ping failed — network error ✗", err);

    return "offline";
  }

  let data: { online?: boolean; error?: string } = {};

  try {
    data = await res.json();
  } catch {
    console.warn(
      "[AI Health] Ping responded but body was not JSON ✗",
      res.status,
    );

    return "offline";
  }

  const status: AiStatus = data.online ? "online" : "offline";

  console.log(
    "[AI Health] Ping responded ←",
    status.toUpperCase(),
    new Date().toLocaleTimeString(),
    data.error ? `(${data.error})` : "",
  );

  return status;
}
/* eslint-enable no-console */

export function useAiHealth(): AiStatus {
  const [status, setStatus] = useState<AiStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    // eslint-disable-next-line no-console
    console.log(
      "[AI Health] Health monitor started — polling every",
      POLL_INTERVAL_MS / 1000,
      "s",
    );

    const check = async () => {
      const s = await ping();

      if (!cancelled) setStatus(s);
    };

    // Fire immediately on mount
    check();

    const timer = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      // eslint-disable-next-line no-console
      console.log("[AI Health] Health monitor stopped");
    };
  }, []);

  return status;
}
