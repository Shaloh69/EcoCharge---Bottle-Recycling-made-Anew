"use client";

import { cn } from "@/lib/utils";

/**
 * Pure-CSS aurora background, re-themed to eco-green/volt-amber — the same
 * technique referenced for the Kiosk's idle screen (02-design-mandate.md
 * SS4.5) and the Velora UI template's own hero (SS6), so both surfaces read
 * as one visual language even though they're built independently.
 *
 * Deliberately no WebGL/ogl dependency — this is a marketing page, not a
 * kiosk that needs a 3D-lock-grade effect, and pure CSS means it degrades
 * to nothing worse than a static gradient if anything goes wrong, with no
 * separate fallback path to maintain.
 */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div className="aurora-layer aurora-layer-1" />
      <div className="aurora-layer aurora-layer-2" />
      <div className="aurora-layer aurora-layer-3" />
      <div className="absolute inset-0 bg-[var(--color-bg)]/40" />
    </div>
  );
}
