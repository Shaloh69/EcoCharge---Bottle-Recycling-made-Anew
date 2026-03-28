"use client";
interface BinIndicatorProps { level: number; }
function getBinColor(level: number): string {
  if (level <= 30) return "#2E7D32";
  if (level <= 50) return "#558B2F";
  if (level <= 70) return "#F57F17";
  if (level <= 90) return "#E65100";
  return "#C62828";
}
function getBinMessage(level: number): string {
  if (level === 0) return "Bin empty";
  if (level <= 20) return "Bin nearly empty";
  if (level <= 50) return "Bin half full";
  if (level <= 70) return "High level detected. Monitor closely.";
  if (level <= 90) return "Bin level high.";
  return "Bin level high. Empty bin required.";
}
export function BinIndicator({ level }: BinIndicatorProps) {
  const color = getBinColor(level);
  const bars = 5;
  const filledBars = Math.ceil((level / 100) * bars);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-32 h-52 rounded-2xl border-4 border-white/50 flex flex-col-reverse overflow-hidden p-1 gap-1"
        style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
        {Array.from({ length: bars }).map((_, i) => (
          <div key={i} className="flex-1 rounded-lg transition-all duration-500"
            style={{ backgroundColor: i < filledBars ? color : "rgba(255,255,255,0.15)" }} />
        ))}
      </div>
      <div className="text-5xl font-bold text-white">{level}%</div>
      <div className="text-white/80 text-lg text-center">{getBinMessage(level)}</div>
    </div>
  );
}
