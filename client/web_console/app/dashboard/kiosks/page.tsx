"use client";
import { useEffect, useState } from "react";
import { addToast } from "@heroui/toast";

import { admin, type Kiosk } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BinGauge } from "@/components/admin/BinGauge";

export default function KiosksPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);

  useEffect(() => {
    admin
      .kiosks()
      .then(setKiosks)
      .catch(() =>
        addToast({ title: "Failed to load kiosks", color: "danger" }),
      );
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          Kiosks
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          All registered kiosk units
        </p>
      </div>

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
            No kiosks found.
          </div>
        )}
        {kiosks.map((k) => (
          <div
            key={k.id}
            className="rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(20,184,166,0.18)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              boxShadow: "0 4px 24px rgba(20,184,166,0.06)",
            }}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3
                  className="font-bold text-lg"
                  style={{ color: "rgba(255,255,255,0.90)" }}
                >
                  {k.name}
                </h3>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  📍 {k.location}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  Last seen:{" "}
                  {k.last_seen_at
                    ? new Date(k.last_seen_at).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <StatusBadge status={k.status} />
            </div>

            <div className="space-y-1.5">
              <div
                className="flex justify-between text-[10px] mb-1"
                style={{ color: "rgba(255,255,255,0.38)" }}
              >
                <span>Bin Level</span>
                <span>—</span>
              </div>
              <BinGauge level={0} />
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: "ID", value: `#${k.id}` },
                { label: "Status", value: k.status },
                { label: "Location", value: k.location },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl p-3"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <p
                    className="text-[10px] uppercase tracking-widest font-semibold mb-1"
                    style={{ color: "rgba(255,255,255,0.32)" }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-xs font-semibold truncate"
                    style={{ color: "rgba(255,255,255,0.70)" }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
