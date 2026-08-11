"use client";

import { useEffect, useRef, useState } from "react";
import { Box } from "@mantine/core";

/**
 * Wraps any SSE-driven value so it gets a visible 150ms background pulse on
 * change — docs/planning/02-design-mandate.md SS3: "SSE-driven values get a
 * 150ms background pulse (volt-amber-400 at 15% opacity) on change —
 * visible heartbeat, not distracting." Compares by the raw value, not a
 * reference, so passing a new object with the same displayed number every
 * poll doesn't falsely pulse.
 */
export function PulseValue({
  value,
  children,
}: {
  value: string | number;
  children: React.ReactNode;
}) {
  const [pulsing, setPulsing] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 150);

    return () => clearTimeout(t);
  }, [value]);

  return (
    <Box
      style={{
        transition: "background-color 150ms ease-out",
        // Real bug, fixed 2026-08-11: this referenced --mantine-color-voltAmber-4,
        // but mantineTheme.ts has no "voltAmber" color (only "voltTeal" and
        // "warningAmber" separately) - the pulse has never actually been
        // visible. warningAmber[4] (#FBBF24) is the mandate's real
        // volt-amber-400 token.
        backgroundColor: pulsing
          ? "color-mix(in srgb, var(--mantine-color-warningAmber-4) 15%, transparent)"
          : "transparent",
        borderRadius: "var(--mantine-radius-sm)",
      }}
    >
      {children}
    </Box>
  );
}
