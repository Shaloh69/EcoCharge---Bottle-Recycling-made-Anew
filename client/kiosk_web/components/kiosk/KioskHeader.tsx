"use client";
export function KioskHeader({ showAccount = false }: { showAccount?: boolean }) {
  return (
    <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: "#1B5E20" }}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">🌿</span>
        <span className="text-white text-xl font-bold">EcoCharge</span>
      </div>
      {showAccount && (
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold cursor-pointer">A</div>
      )}
    </div>
  );
}
