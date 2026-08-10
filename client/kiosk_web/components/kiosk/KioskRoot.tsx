"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { IdleScreen } from "./IdleScreen";

import { IdleSuspendProvider, useIdleSuspendState } from "@/lib/idle-suspend";

const HOME_IDLE_MS = 30_000;
const AWAY_IDLE_MS = 120_000;
const IDLE_EVENTS = [
  "touchstart",
  "click",
  "mousemove",
  "keydown",
  "scroll",
] as const;

export function KioskRoot({ children }: { children: React.ReactNode }) {
  return (
    <IdleSuspendProvider>
      <KioskRootInner>{children}</KioskRootInner>
    </IdleSuspendProvider>
  );
}

function KioskRootInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const suspended = useIdleSuspendState();

  const [showIdle, setShowIdle] = useState(false);

  // Refs so timer callbacks always see current values without stale closures
  const isHomeRef = useRef(pathname === "/");
  const routerRef = useRef(router);
  const idleRef = useRef(false); // mirrors showIdle — prevents event-handler re-registration
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suspendedRef = useRef(suspended);

  useEffect(() => {
    isHomeRef.current = pathname === "/";
  }, [pathname]);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // Schedule the next idle trigger based on the current page. A no-op while
  // suspended (SCANNING, bin-confirmation) — the effect below re-arms this
  // once suspension actually clears, rather than letting a stale timer fire
  // mid-scan just because it happened to be longer than that particular
  // scan took.
  const startTimer = useCallback(() => {
    clearTimer();
    if (suspendedRef.current) return;
    const ms = isHomeRef.current ? HOME_IDLE_MS : AWAY_IDLE_MS;

    timerRef.current = setTimeout(() => {
      if (suspendedRef.current) return; // safety net if suspension raced the timeout
      idleRef.current = true;
      setShowIdle(true);
      if (!isHomeRef.current) {
        routerRef.current.push("/");
      }
    }, ms);
  }, []);

  // User activity → reset timer (skip while idle screen is visible).
  const resetIdle = useCallback(() => {
    if (idleRef.current) return;
    startTimer();
  }, [startTimer]);

  // Suspension changes → clear the timer immediately while suspended, and
  // re-arm it the moment suspension lifts (unless the idle screen is
  // already showing, in which case activity/dismiss handles it as usual).
  useEffect(() => {
    suspendedRef.current = suspended;
    if (suspended) {
      clearTimer();
    } else if (!idleRef.current) {
      startTimer();
    }
  }, [suspended, startTimer]);

  // Wire up global activity listeners once on mount.
  useEffect(() => {
    IDLE_EVENTS.forEach((e) =>
      window.addEventListener(e, resetIdle, { passive: true }),
    );
    startTimer();

    return () => {
      IDLE_EVENTS.forEach((e) => window.removeEventListener(e, resetIdle));
      clearTimer();
    };
  }, []);

  // Dismiss idle screen → hide overlay and restart timer for current page.
  const handleDismiss = useCallback(() => {
    idleRef.current = false;
    setShowIdle(false);
    startTimer();
  }, [startTimer]);

  return (
    <>
      {/*
       * Portrait shell — fixed to viewport height, centred, scrollable inside.
       * 600 px keeps kiosk UI focused on a 15.6" landscape touchscreen.
       */}
      <div
        style={{
          position: "relative",
          flex: 1,
          height: "100%",
          maxWidth: 600,
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={pathname}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              initial={{ opacity: 0, y: 20 }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: "100%",
              }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Idle overlay — covers full viewport only when triggered */}
      <AnimatePresence>
        {showIdle && (
          <motion.div
            key="idle"
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 50 }}
            transition={{ duration: 0.3 }}
          >
            <IdleScreen onDismiss={handleDismiss} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
