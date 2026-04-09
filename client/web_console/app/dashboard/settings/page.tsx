"use client";
import { useEffect, useState } from "react";
import { addToast } from "@heroui/toast";

import { admin } from "@/lib/api";

type Settings = {
  credit_tier_s_max_ml: string;
  credit_tier_s_credits: string;
  credit_tier_m_max_ml: string;
  credit_tier_m_credits: string;
  credit_tier_l_credits: string;
  energy_budget_wh_per_credit: string;
  base_minutes_per_credit: string;
  max_charging_seconds: string;
  electricity_rate_php_per_kwh: string;
};

const DEFAULTS: Settings = {
  credit_tier_s_max_ml: "350",
  credit_tier_s_credits: "1",
  credit_tier_m_max_ml: "500",
  credit_tier_m_credits: "2",
  credit_tier_l_credits: "3",
  energy_budget_wh_per_credit: "5",
  base_minutes_per_credit: "10",
  max_charging_seconds: "3600",
  electricity_rate_php_per_kwh: "11.0",
};

const GLASS = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
} as const;

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.88)",
  outline: "none",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    admin
      .settings()
      .then((s) => {
        setSettings({ ...DEFAULTS, ...(s as Settings) });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        addToast({
          title: "Failed to load settings",
          description: "Could not fetch settings from server.",
          color: "danger",
        });
      });
  }, []);

  const set = (key: keyof Settings, val: string) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await admin.saveSettings(
        settings as Record<string, string>,
      );

      setSettings({ ...DEFAULTS, ...(updated as Settings) });
      addToast({
        title: "Settings saved",
        description: "All changes have been applied.",
        color: "success",
      });
    } catch (e) {
      addToast({
        title: "Save failed",
        description: (e as Error).message ?? "Could not save settings.",
        color: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            Settings
          </h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          Settings
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          System configuration and credit tiers
        </p>
      </div>

      <div className="space-y-5 max-w-2xl">
        {/* Credit Tiers */}
        <div className="rounded-2xl p-6" style={GLASS}>
          <h2
            className="text-sm font-bold mb-0.5"
            style={{ color: "rgba(255,255,255,0.80)" }}
          >
            Credit Tiers (by volume)
          </h2>
          <p
            className="text-xs mb-5"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Credits awarded when a bottle is deposited, based on volume.
          </p>
          <div className="space-y-1">
            {[
              {
                label: `Small bottle (≤${settings.credit_tier_s_max_ml}ml)`,
                key: "credit_tier_s_credits" as keyof Settings,
              },
              {
                label: `Medium bottle (${settings.credit_tier_s_max_ml}–${settings.credit_tier_m_max_ml}ml)`,
                key: "credit_tier_m_credits" as keyof Settings,
              },
              {
                label: `Large bottle (>${settings.credit_tier_m_max_ml}ml)`,
                key: "credit_tier_l_credits" as keyof Settings,
              },
            ].map(({ label, key }) => (
              <div
                key={key}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "rgba(255,255,255,0.78)" }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Credits per deposit
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="w-16 rounded-xl px-3 py-1.5 text-sm text-center"
                    min="1"
                    step="1"
                    style={inputStyle}
                    type="number"
                    value={settings[key]}
                    onBlur={(e) => {
                      e.target.style.border =
                        "1px solid rgba(255,255,255,0.12)";
                      e.target.style.boxShadow = "none";
                    }}
                    onChange={(e) => set(key, e.target.value)}
                    onFocus={(e) => {
                      e.target.style.border =
                        "1px solid rgba(148,163,184,0.50)";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(148,163,184,0.10)";
                    }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.40)" }}
                  >
                    credits
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Volume Thresholds */}
        <div className="rounded-2xl p-6" style={GLASS}>
          <h2
            className="text-sm font-bold mb-0.5"
            style={{ color: "rgba(255,255,255,0.80)" }}
          >
            Volume Thresholds (ml)
          </h2>
          <p
            className="text-xs mb-5"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Define where S/M/L boundaries fall.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                id: "tier-s-max",
                label: "S/M boundary (max ml for Small)",
                key: "credit_tier_s_max_ml" as keyof Settings,
                min: 100,
                step: 50,
              },
              {
                id: "tier-m-max",
                label: "M/L boundary (max ml for Medium)",
                key: "credit_tier_m_max_ml" as keyof Settings,
                min: 200,
                step: 50,
              },
            ].map(({ id, label, key, min, step }) => (
              <div key={id}>
                <label
                  className="text-xs block mb-1.5"
                  htmlFor={id}
                  style={{ color: "rgba(255,255,255,0.42)" }}
                >
                  {label}
                </label>
                <input
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  id={id}
                  min={min}
                  step={step}
                  style={inputStyle}
                  type="number"
                  value={settings[key]}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid rgba(255,255,255,0.12)";
                    e.target.style.boxShadow = "none";
                  }}
                  onChange={(e) => set(key, e.target.value)}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid rgba(148,163,184,0.50)";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(148,163,184,0.10)";
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Charging Settings */}
        <div className="rounded-2xl p-6" style={GLASS}>
          <h2
            className="text-sm font-bold mb-0.5"
            style={{ color: "rgba(255,255,255,0.80)" }}
          >
            Charging Settings
          </h2>
          <p
            className="text-xs mb-5"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Controls how long each credit lasts and energy budget per credit.
          </p>
          <div className="space-y-1">
            {[
              {
                label: "Energy budget per credit (Wh)",
                sub: "Actual Wh allocated; dynamic duration based on real draw",
                key: "energy_budget_wh_per_credit" as keyof Settings,
                unit: "Wh",
                w: "w-20",
                min: 1,
                step: 0.5,
              },
              {
                label: "Base minutes per credit",
                sub: "Fallback when no telemetry available",
                key: "base_minutes_per_credit" as keyof Settings,
                unit: "min",
                w: "w-20",
                min: 1,
                step: 1,
              },
              {
                label: "Max charging duration",
                sub: "Hard cap regardless of credits",
                key: "max_charging_seconds" as keyof Settings,
                unit: "sec",
                w: "w-24",
                min: 60,
                step: 60,
              },
            ].map(({ label, sub, key, unit, w, min, step }) => (
              <div
                key={key}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "rgba(255,255,255,0.78)" }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    {sub}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className={`${w} rounded-xl px-3 py-1.5 text-sm text-center`}
                    min={min}
                    step={step}
                    style={inputStyle}
                    type="number"
                    value={settings[key]}
                    onBlur={(e) => {
                      e.target.style.border =
                        "1px solid rgba(255,255,255,0.12)";
                      e.target.style.boxShadow = "none";
                    }}
                    onChange={(e) => set(key, e.target.value)}
                    onFocus={(e) => {
                      e.target.style.border =
                        "1px solid rgba(148,163,184,0.50)";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(148,163,184,0.10)";
                    }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.40)" }}
                  >
                    {unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Economics */}
        <div className="rounded-2xl p-6" style={GLASS}>
          <h2
            className="text-sm font-bold mb-0.5"
            style={{ color: "rgba(255,255,255,0.80)" }}
          >
            Economics
          </h2>
          <p
            className="text-xs mb-5"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Used to calculate gain/loss in analytics.
          </p>
          <div className="flex items-center justify-between py-3">
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: "rgba(255,255,255,0.78)" }}
              >
                Electricity rate (PHP/kWh)
              </p>
              <p
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Meralco / local utility rate
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="w-24 rounded-xl px-3 py-1.5 text-sm text-center"
                min="1"
                step="0.1"
                style={inputStyle}
                type="number"
                value={settings.electricity_rate_php_per_kwh}
                onBlur={(e) => {
                  e.target.style.border = "1px solid rgba(255,255,255,0.12)";
                  e.target.style.boxShadow = "none";
                }}
                onChange={(e) =>
                  set("electricity_rate_php_per_kwh", e.target.value)
                }
                onFocus={(e) => {
                  e.target.style.border = "1px solid rgba(148,163,184,0.50)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(148,163,184,0.10)";
                }}
              />
              <span
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.40)" }}
              >
                ₱/kWh
              </span>
            </div>
          </div>
        </div>

        <button
          className="px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
          disabled={saving}
          style={{
            background: "linear-gradient(135deg, #4CAF50, #16A34A)",
            color: "#fff",
            boxShadow: "0 8px 24px rgba(76,175,80,0.28)",
          }}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
