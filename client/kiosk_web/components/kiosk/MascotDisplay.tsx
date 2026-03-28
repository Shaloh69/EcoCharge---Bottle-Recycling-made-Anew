"use client";
type MascotMood = "idle" | "happy" | "scanning" | "sad" | "alert";
const moodConfig: Record<MascotMood, { bg: string; emoji: string; label: string }> = {
  idle: { bg: "#2E7D32", emoji: "🌿", label: "" },
  happy: { bg: "#388E3C", emoji: "🎉", label: "" },
  scanning: { bg: "#00695C", emoji: "🔍", label: "" },
  sad: { bg: "#5D4037", emoji: "😔", label: "" },
  alert: { bg: "#E65100", emoji: "⚠️", label: "" },
};

export function MascotFull({ mood = "idle" }: { mood?: MascotMood }) {
  const config = moodConfig[mood];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-48 h-48 rounded-full flex flex-col items-center justify-center shadow-2xl text-7xl"
        style={{ backgroundColor: config.bg, border: "6px solid rgba(255,255,255,0.3)" }}>
        {config.emoji}
      </div>
      <div className="w-32 h-6 rounded-full bg-black/20" />
    </div>
  );
}

export function MascotAvatar({ mood = "idle" }: { mood?: MascotMood }) {
  const config = moodConfig[mood];
  return (
    <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-lg"
      style={{ backgroundColor: config.bg, border: "4px solid rgba(255,255,255,0.3)" }}>
      {config.emoji}
    </div>
  );
}
