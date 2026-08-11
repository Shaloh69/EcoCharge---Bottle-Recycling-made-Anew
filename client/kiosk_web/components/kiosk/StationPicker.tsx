"use client";
import { Plug, Plus } from "lucide-react";

/**
 * Charging-station picker grid, per docs/planning/02-design-mandate.md
 * SS4.6: numbered "Station N" tiles (wall-socket icon + a "+" select
 * button — green when selectable, dark red "+" for the occupied/
 * unavailable state), with a persistent bottom confirm bar
 * (Back | You Selected: Station N | Confirm).
 */
export interface Station {
  id: number;
  type: string;
  inUse: boolean;
}

export function StationGrid({
  stations,
  selected,
  onSelect,
}: {
  stations: Station[];
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {stations.map((s) => {
        const isSelected = selected === s.id;

        return (
          <button
            key={s.id}
            className="rounded-2xl p-5 flex flex-col items-center gap-2 transition-all active:scale-95"
            disabled={s.inUse}
            style={{
              background: s.inUse
                ? "#F3F4F6"
                : isSelected
                  ? "#DCFCE7"
                  : "#FFFFFF",
              border: `2px solid ${s.inUse ? "#E5E7EB" : isSelected ? "#16A34A" : "#E5EFE8"}`,
              boxShadow: isSelected
                ? "0 8px 24px rgba(22,163,74,0.18)"
                : "0 2px 10px rgba(20,35,27,0.05)",
              opacity: s.inUse ? 0.65 : 1,
              cursor: s.inUse ? "not-allowed" : "pointer",
            }}
            type="button"
            onClick={() => !s.inUse && onSelect(s.id)}
          >
            <Plug color={s.inUse ? "#9CA3AF" : "#16A34A"} size={30} />
            <span className="font-bold text-[#14231B] text-base">
              Station {s.id}
            </span>
            <span className="text-xs text-[#4A6B58]">{s.type}</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: s.inUse ? "#7F1D1D" : "#16A34A",
                marginTop: 4,
              }}
            >
              <Plus color="#fff" size={18} strokeWidth={3} />
            </div>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full mt-1"
              style={
                s.inUse
                  ? { background: "#FEE2E2", color: "#B91C1C" }
                  : { background: "#DCFCE7", color: "#15803D" }
              }
            >
              {s.inUse ? "Occupied" : "Available"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function StationConfirmBar({
  selected,
  disabled,
  loading,
  onBack,
  onConfirm,
}: {
  selected: number | null;
  disabled: boolean;
  loading: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="sticky bottom-0 left-0 right-0 flex items-center gap-3 px-5 py-4"
      style={{
        background: "#FFFFFF",
        borderTop: "1px solid #E5EFE8",
        boxShadow: "0 -4px 20px rgba(20,35,27,0.06)",
      }}
    >
      <button
        className="text-sm font-semibold text-[#4A6B58] px-4 py-3 rounded-xl active:scale-95 transition-all"
        type="button"
        onClick={onBack}
      >
        ← Back
      </button>
      <div className="flex-1 text-center text-sm font-semibold text-[#14231B]">
        {selected ? `You Selected: Station ${selected}` : "Select a station"}
      </div>
      <button
        className="text-white text-sm font-bold px-6 py-3 rounded-xl active:scale-95 transition-all disabled:opacity-40"
        disabled={disabled}
        style={{ background: "#16A34A" }}
        type="button"
        onClick={onConfirm}
      >
        {loading ? "Starting…" : "Confirm"}
      </button>
    </div>
  );
}
