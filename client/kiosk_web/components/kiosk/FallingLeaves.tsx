"use client";
import { useMemo } from "react";

/**
 * Idle-screen animated background — decided 2026-08-11, replacing the
 * researched-but-never-built Aurora direction (docs/planning/02-design-mandate.md
 * SS4.5). A real leaf SVG shape (not emoji, not a photo) recolored to the
 * product's own eco-green/volt-amber/bloom-violet palette rather than literal
 * autumn brown — the leaf motif is the point, not the season. Pure CSS
 * transform/opacity animation, no canvas/WebGL, so it degrades safely on
 * constrained kiosk hardware; prefers-reduced-motion is already handled
 * globally in styles/globals.css (freezes every animation on this surface).
 */

// Mostly green shades, with amber/violet as a deliberately rare accent
// (roughly 1-in-6 leaves) rather than an even split across all five hues.
const LEAF_COLORS = [
  "#16A34A", // eco-green-500
  "#15803D", // eco-green-600
  "#4ADE80", // eco-green-400
  "#16A34A",
  "#15803D",
  "#FBBF24", // volt-amber-400 accent
  "#4ADE80",
  "#15803D",
  "#16A34A",
  "#9B6FE0", // bloom-violet accent
  "#4ADE80",
  "#16A34A",
];

interface Leaf {
  id: number;
  left: string;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  rotateStart: number;
  color: string;
  opacity: number;
}

const LEAF_COUNT = 18;

export function FallingLeaves() {
  const leaves = useMemo<Leaf[]>(() => {
    return Array.from({ length: LEAF_COUNT }, (_, i) => ({
      id: i,
      left: `${(i * 5.7 + (i % 4) * 3.1) % 100}%`,
      size: 14 + (i % 5) * 4, // 14 -> 30px
      duration: 10 + (i % 6) * 2, // 10 -> 20s
      delay: -(i * 1.7),
      drift: 30 + (i % 4) * 18, // px of horizontal sway
      rotateStart: (i * 47) % 360,
      color: LEAF_COLORS[i % LEAF_COLORS.length],
      opacity: 0.35 + (i % 4) * 0.12,
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          style={{
            position: "absolute",
            left: leaf.left,
            top: -40,
            width: leaf.size,
            height: leaf.size,
            opacity: leaf.opacity,
            willChange: "transform",
            animation: `leaf-fall ${leaf.duration}s linear ${leaf.delay}s infinite`,
            // per-leaf sway distance/rotation fed in as custom properties so
            // one shared keyframe can drive every leaf differently
            ["--leaf-drift" as string]: `${leaf.drift}px`,
            ["--leaf-rotate-start" as string]: `${leaf.rotateStart}deg`,
          }}
        >
          <svg
            fill="none"
            height="100%"
            viewBox="0 0 24 24"
            width="100%"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C7 2 3 6.5 3 12c0 5.5 4 9.5 9 10 0-5.5 0-9.5 0-10-2.5-1-4.5-2.7-5.7-5C8 8.5 9.7 8 12 8c5 0 9 4 9 4 0-5.5-4-10-9-10Z"
              fill={leaf.color}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
