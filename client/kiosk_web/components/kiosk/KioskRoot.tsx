"use client";
import { FallingLeaves } from "./FallingLeaves";
import { IdleScreen } from "./IdleScreen";

import { useIdle } from "@/hooks/useIdle";

export function KioskRoot({ children }: { children: React.ReactNode }) {
  const idle = useIdle(10_000);

  return (
    <>
      {/* Ambient leaf animation — always behind everything */}
      <FallingLeaves />

      {/* Portrait content shell */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          maxWidth: 430,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>

      {/* Idle overlay — clicking it resets idle via window click event in useIdle */}
      {idle && <IdleScreen onDismiss={() => {}} />}
    </>
  );
}
