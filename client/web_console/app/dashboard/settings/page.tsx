"use client";
import { useEffect, useState } from "react";

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    admin
      .settings()
      .then((s) => {
        setSettings({ ...DEFAULTS, ...(s as Settings) });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const set = (key: keyof Settings, val: string) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await admin.saveSettings(
        settings as Record<string, string>,
      );

      setSettings({ ...DEFAULTS, ...(updated as Settings) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
      <div className="space-y-6 max-w-2xl">
        {/* Credit Tiers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-gray-800 font-semibold mb-1">
            Credit Tiers (by volume)
          </h2>
          <p className="text-gray-400 text-xs mb-4">
            Credits awarded when a bottle is deposited, based on volume.
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-gray-700 text-sm font-medium">
                  Small bottle (≤{settings.credit_tier_s_max_ml}ml)
                </p>
                <p className="text-gray-400 text-xs">Credits per deposit</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="w-16 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="1"
                  step="1"
                  type="number"
                  value={settings.credit_tier_s_credits}
                  onChange={(e) => set("credit_tier_s_credits", e.target.value)}
                />
                <span className="text-gray-500 text-sm">credits</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-gray-700 text-sm font-medium">
                  Medium bottle ({settings.credit_tier_s_max_ml}–
                  {settings.credit_tier_m_max_ml}ml)
                </p>
                <p className="text-gray-400 text-xs">Credits per deposit</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="w-16 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="1"
                  step="1"
                  type="number"
                  value={settings.credit_tier_m_credits}
                  onChange={(e) => set("credit_tier_m_credits", e.target.value)}
                />
                <span className="text-gray-500 text-sm">credits</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-gray-700 text-sm font-medium">
                  Large bottle (&gt;{settings.credit_tier_m_max_ml}ml)
                </p>
                <p className="text-gray-400 text-xs">Credits per deposit</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="w-16 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="1"
                  step="1"
                  type="number"
                  value={settings.credit_tier_l_credits}
                  onChange={(e) => set("credit_tier_l_credits", e.target.value)}
                />
                <span className="text-gray-500 text-sm">credits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Volume Thresholds */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-gray-800 font-semibold mb-1">
            Volume Thresholds (ml)
          </h2>
          <p className="text-gray-400 text-xs mb-4">
            Define where S/M/L boundaries fall.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="text-xs text-gray-500 block mb-1"
                htmlFor="tier-s-max"
              >
                S/M boundary (max ml for Small)
              </label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                id="tier-s-max"
                min="100"
                step="50"
                type="number"
                value={settings.credit_tier_s_max_ml}
                onChange={(e) => set("credit_tier_s_max_ml", e.target.value)}
              />
            </div>
            <div>
              <label
                className="text-xs text-gray-500 block mb-1"
                htmlFor="tier-m-max"
              >
                M/L boundary (max ml for Medium)
              </label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                id="tier-m-max"
                min="200"
                step="50"
                type="number"
                value={settings.credit_tier_m_max_ml}
                onChange={(e) => set("credit_tier_m_max_ml", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Charging */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-gray-800 font-semibold mb-1">
            Charging Settings
          </h2>
          <p className="text-gray-400 text-xs mb-4">
            Controls how long each credit lasts and energy budget per credit.
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-gray-700 text-sm font-medium">
                  Energy budget per credit (Wh)
                </p>
                <p className="text-gray-400 text-xs">
                  Actual Wh allocated; dynamic duration based on real draw
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="1"
                  step="0.5"
                  type="number"
                  value={settings.energy_budget_wh_per_credit}
                  onChange={(e) =>
                    set("energy_budget_wh_per_credit", e.target.value)
                  }
                />
                <span className="text-gray-500 text-sm">Wh</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-gray-700 text-sm font-medium">
                  Base minutes per credit
                </p>
                <p className="text-gray-400 text-xs">
                  Fallback when no telemetry available
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="1"
                  step="1"
                  type="number"
                  value={settings.base_minutes_per_credit}
                  onChange={(e) =>
                    set("base_minutes_per_credit", e.target.value)
                  }
                />
                <span className="text-gray-500 text-sm">min</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-gray-700 text-sm font-medium">
                  Max charging duration
                </p>
                <p className="text-gray-400 text-xs">
                  Hard cap regardless of credits
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="60"
                  step="60"
                  type="number"
                  value={settings.max_charging_seconds}
                  onChange={(e) => set("max_charging_seconds", e.target.value)}
                />
                <span className="text-gray-500 text-sm">sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* Economics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-gray-800 font-semibold mb-1">Economics</h2>
          <p className="text-gray-400 text-xs mb-4">
            Used to calculate gain/loss in analytics.
          </p>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-gray-700 text-sm font-medium">
                Electricity rate (PHP/kWh)
              </p>
              <p className="text-gray-400 text-xs">
                Meralco / local utility rate
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                min="1"
                step="0.1"
                type="number"
                value={settings.electricity_rate_php_per_kwh}
                onChange={(e) =>
                  set("electricity_rate_php_per_kwh", e.target.value)
                }
              />
              <span className="text-gray-500 text-sm">₱/kWh</span>
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {saved && (
          <p className="text-green-600 text-sm font-medium">
            Settings saved successfully.
          </p>
        )}

        <button
          className="px-6 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          disabled={saving}
          style={{ backgroundColor: "#1B5E20" }}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
