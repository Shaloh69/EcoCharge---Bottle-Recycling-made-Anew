"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { addToast } from "@/lib/toast";
import { admin, type Kiosk } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BinGauge } from "@/components/admin/BinGauge";

const glass = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(20,184,166,0.18)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 4px 24px rgba(20,184,166,0.06)",
};
const dimText = (op: number) => ({ color: `rgba(255,255,255,${op})` });

export default function KiosksPage() {
  const router = useRouter();
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  useEffect(() => {
    admin
      .kiosks()
      .then(setKiosks)
      .catch(() =>
        addToast({ title: "Failed to load kiosks", color: "danger" }),
      );
  }, []);

  const createKiosk = async () => {
    if (!newName.trim() || !newLocation.trim()) {
      addToast({ title: "Name and location are required", color: "warning" });

      return;
    }
    try {
      const k = await admin.createKiosk(newName.trim(), newLocation.trim());

      setNewApiKey((k as Kiosk & { api_key: string }).api_key);
      setKiosks((prev) => [...prev, k]);
      setNewName("");
      setNewLocation("");
    } catch (err) {
      addToast({ title: (err as Error).message, color: "danger" });
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={dimText(0.92)}
          >
            Kiosks
          </h1>
          <p className="text-sm mt-0.5" style={dimText(0.38)}>
            All registered kiosk units
          </p>
        </div>
        <button
          className="rounded-xl px-4 py-2 text-sm font-semibold"
          style={{
            background: "rgba(20,184,166,0.18)",
            border: "1px solid rgba(20,184,166,0.45)",
            color: "rgba(255,255,255,0.85)",
          }}
          onClick={() => {
            setCreating(true);
            setNewApiKey(null);
          }}
        >
          + New Kiosk
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-2xl p-5 space-y-3" style={glass}>
          <p className="text-sm font-semibold" style={dimText(0.7)}>
            Create New Kiosk
          </p>
          {newApiKey ? (
            <div className="space-y-3">
              <p className="text-xs" style={dimText(0.65)}>
                Kiosk created! Copy this API key and flash it as{" "}
                <code style={{ color: "#14b8a6" }}>DEVICE_API_KEY</code> in the
                ESP firmware. It will not be shown again.
              </p>
              <p
                className="text-xs font-mono break-all rounded-xl px-3 py-2"
                style={{
                  background: "rgba(20,184,166,0.08)",
                  color: "rgba(20,184,166,0.90)",
                }}
              >
                {newApiKey}
              </p>
              <button
                className="rounded-xl px-4 py-2 text-xs font-semibold"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.65)",
                }}
                onClick={() => {
                  setCreating(false);
                  setNewApiKey(null);
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <input
                placeholder="Kiosk name (e.g. Kiosk-002)"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.85)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 13,
                }}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                placeholder="Location (e.g. Building B Lobby)"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.85)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 13,
                }}
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  className="rounded-xl px-4 py-2 text-xs font-semibold"
                  style={{
                    background: "rgba(20,184,166,0.18)",
                    border: "1px solid rgba(20,184,166,0.45)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                  onClick={createKiosk}
                >
                  Create
                </button>
                <button
                  className="rounded-xl px-4 py-2 text-xs font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.50)",
                  }}
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Kiosk list */}
      <div className="grid gap-4">
        {kiosks.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center text-sm"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            No kiosks found. Create one above.
          </div>
        )}
        {kiosks.map((k) => (
          <button
            key={k.id}
            className="rounded-2xl p-5 w-full text-left cursor-pointer hover:border-teal-400/40 transition-all"
            style={glass}
            type="button"
            onClick={() => router.push(`/dashboard/kiosks/${k.id}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-base" style={dimText(0.9)}>
                  {k.name}
                </h3>
                <p className="text-xs mt-0.5" style={dimText(0.42)}>
                  {"📍 "}
                  {k.location}
                </p>
                <p className="text-[10px] mt-1" style={dimText(0.28)}>
                  Last seen:{" "}
                  {k.last_seen_at
                    ? new Date(k.last_seen_at).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={k.status} />
                <span className="text-xs" style={dimText(0.35)}>
                  →
                </span>
              </div>
            </div>
            <BinGauge level={0} />
            <p className="text-[10px] mt-2 text-right" style={dimText(0.28)}>
              Click to manage →
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
