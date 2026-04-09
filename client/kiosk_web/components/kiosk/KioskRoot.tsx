"use client";
import { IdleScreen } from "./IdleScreen";
import { useIdle } from "@/hooks/useIdle";

export function KioskRoot({ children }: { children: React.ReactNode }) {
  const idle = useIdle(10_000);

  return (
    <>
      {/*
       * Portrait shell — fixed to viewport height, centred, scrollable inside.
       * max-width 430 keeps kiosk UI portrait even on landscape monitors.
       */}
      <div
        style={{
          position: "relative",
          flex: 1,
          height: "100%",
          maxWidth: 430,
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Scrollable content area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {children}
        </div>
      </div>

      {/* Idle overlay — covers full viewport when triggered */}
      {idle && <IdleScreen onDismiss={() => {}} />}
    </>
  );
}
