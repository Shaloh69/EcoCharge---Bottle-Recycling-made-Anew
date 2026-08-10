"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * Lets any page tell KioskRoot "don't idle-timeout right now" — the real
 * gap docs/planning/02-design-mandate.md SS4.2 calls out: KioskRoot already
 * had a generic activity-based idle timer, but nothing FSM-aware suspended
 * it during SCANNING or bin-confirmation, where a user is *supposed* to
 * stand still without touching the screen. A longer timeout happening to
 * usually outlast a normal scan isn't the same as actually being suspended.
 */
interface IdleSuspendContextValue {
  suspended: boolean;
  setSuspended: (id: string, value: boolean) => void;
}

const IdleSuspendContext = createContext<IdleSuspendContextValue | null>(null);

export function IdleSuspendProvider({ children }: { children: React.ReactNode }) {
  // A Set of active suspend-request IDs, not a single boolean — so two
  // independent callers (e.g. a future second "don't idle" reason) can't
  // clobber each other by both writing the same flag.
  const [reasons, setReasons] = useState<Set<string>>(new Set());

  const setSuspended = useCallback((id: string, value: boolean) => {
    setReasons((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return (
    <IdleSuspendContext.Provider value={{ suspended: reasons.size > 0, setSuspended }}>
      {children}
    </IdleSuspendContext.Provider>
  );
}

export function useIdleSuspendState() {
  const ctx = useContext(IdleSuspendContext);
  if (!ctx) throw new Error("useIdleSuspendState must be used within IdleSuspendProvider");
  return ctx.suspended;
}

/**
 * Call from any page/component: useSuspendIdle(true) while a "please don't
 * leave yet" state is active (SCANNING, bin-confirmation), useSuspendIdle
 * (false) — or just let the condition go false — once it passes. Registers
 * under a stable per-call id and always cleans up on unmount, so navigating
 * away mid-scan can't leave idle permanently suspended.
 */
export function useSuspendIdle(active: boolean, id = "default") {
  const ctx = useContext(IdleSuspendContext);
  const idRef = useRef(id);

  useEffect(() => {
    if (!ctx) return;
    ctx.setSuspended(idRef.current, active);
    return () => ctx.setSuspended(idRef.current, false);
  }, [ctx, active]);
}
