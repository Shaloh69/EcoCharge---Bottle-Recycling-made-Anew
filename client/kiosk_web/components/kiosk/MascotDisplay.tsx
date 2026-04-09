"use client";

type MascotMood = "idle" | "happy" | "scanning" | "sad" | "alert";

const moodConfig: Record<
  MascotMood,
  { from: string; to: string; emoji: string; glow: string }
> = {
  idle: {
    from: "#1B5E20",
    to: "#0A2E0F",
    emoji: "🌿",
    glow: "rgba(76,175,80,0.4)",
  },
  happy: {
    from: "#166534",
    to: "#065F46",
    emoji: "🎉",
    glow: "rgba(34,197,94,0.5)",
  },
  scanning: {
    from: "#0F766E",
    to: "#0A2E2B",
    emoji: "🔍",
    glow: "rgba(20,184,166,0.45)",
  },
  sad: {
    from: "#5D4037",
    to: "#3E2723",
    emoji: "😔",
    glow: "rgba(180,83,9,0.35)",
  },
  alert: {
    from: "#B45309",
    to: "#7C2D12",
    emoji: "⚠️",
    glow: "rgba(245,158,11,0.5)",
  },
};

export function MascotFull({ mood = "idle" }: { mood?: MascotMood }) {
  const c = moodConfig[mood];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative bounce-in">
        <div
          className="w-44 h-44 rounded-full flex items-center justify-center text-7xl pulse-glow"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${c.from}, ${c.to})`,
            border: "5px solid rgba(255,255,255,0.18)",
            boxShadow: `0 0 48px ${c.glow}, inset 0 0 32px rgba(0,0,0,0.3)`,
          }}
        >
          {c.emoji}
        </div>
        {/* ripple ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${c.glow}`,
            animation: "ripple 2.5s ease-out infinite",
          }}
        />
      </div>
      {/* shadow */}
      <div
        className="w-28 h-4 rounded-full"
        style={{ background: "rgba(0,0,0,0.25)", filter: "blur(6px)" }}
      />
    </div>
  );
}

export function MascotAvatar({ mood = "idle" }: { mood?: MascotMood }) {
  const c = moodConfig[mood];

  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
      style={{
        background: `radial-gradient(circle at 35% 35%, ${c.from}, ${c.to})`,
        border: "3px solid rgba(255,255,255,0.18)",
        boxShadow: `0 0 24px ${c.glow}`,
      }}
    >
      {c.emoji}
    </div>
  );
}
