"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useIdle(timeoutMs: number): boolean {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setIdle(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIdle(true), timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    const events = ["touchstart", "click", "mousemove", "keydown", "scroll"];

    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reset]);

  return idle;
}
