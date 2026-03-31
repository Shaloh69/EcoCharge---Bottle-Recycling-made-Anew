"use client";
import { useMemo } from "react";

interface Leaf {
  id: number;
  left: string;
  size: number;
  duration: number;
  delay: number;
  emoji: string;
  opacity: number;
}

const EMOJIS = ["🍃", "🍃", "🌿", "🍃", "🍃", "🍂"];

export function FallingLeaves() {
  const leaves = useMemo<Leaf[]>(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: `${(i * 4.3 + (i % 5) * 2.1) % 100}%`,
      size: 10 + (i % 5) * 3, // 10 → 22 px
      duration: 9 + (i % 7) * 1.5, // 9 → 19.5 s
      delay: -(i * 1.3), // stagger, already mid-flight
      emoji: EMOJIS[i % EMOJIS.length],
      opacity: 0.28 + (i % 5) * 0.1,
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {leaves.map((leaf) => (
        <span
          key={leaf.id}
          style={{
            position: "absolute",
            left: leaf.left,
            top: 0,
            fontSize: leaf.size,
            opacity: leaf.opacity,
            animation: `leaf-fall ${leaf.duration}s linear ${leaf.delay}s infinite`,
            userSelect: "none",
            willChange: "transform",
          }}
        >
          {leaf.emoji}
        </span>
      ))}
    </div>
  );
}
