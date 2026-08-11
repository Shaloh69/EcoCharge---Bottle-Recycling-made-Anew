"use client";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { addToast } from "@/lib/toast";
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

function SettingRow({
  label,
  sub,
  value,
  onChange,
  unit,
  min,
  step,
}: {
  label: string;
  sub: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  min: number;
  step: number;
}) {
  return (
    <Group justify="space-between" py="sm" wrap="nowrap">
      <div>
        <Text fw={500} size="sm">
          {label}
        </Text>
        <Text c="dimmed" size="xs">
          {sub}
        </Text>
      </div>
      <NumberInput
        min={min}
        rightSection={
          <Text c="dimmed" pr={4} size="xs">
            {unit}
          </Text>
        }
        rightSectionWidth={44}
        step={step}
        value={value}
        w={110}
        onChange={(v) => onChange(String(v))}
      />
    </Group>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    admin
      .settings()
      .then((s) => setSettings({ ...DEFAULTS, ...(s as Settings) }))
      .catch(() =>
        addToast({
          title: "Failed to load settings",
          description: "Could not fetch settings from server.",
          color: "danger",
        }),
      )
      .finally(() => setLoading(false));
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

  return (
    <Stack gap="lg" maw={640} p={{ base: "md", md: "xl" }}>
      <div>
        <Title order={2}>Settings</Title>
        <Text c="dimmed" size="sm">
          System configuration and credit tiers
        </Text>
      </div>

      <Skeleton radius="md" visible={loading}>
        <Stack gap="md">
          <Card withBorder p="lg" radius="md">
            <Text fw={700} size="sm">
              Credit Tiers (by volume)
            </Text>
            <Text c="dimmed" mb="xs" size="xs">
              Credits awarded when a bottle is deposited, based on volume.
            </Text>
            <Divider />
            <SettingRow
              label={`Small bottle (≤${settings.credit_tier_s_max_ml}ml)`}
              min={1}
              step={1}
              sub="Credits per deposit"
              unit="cr"
              value={settings.credit_tier_s_credits}
              onChange={(v) => set("credit_tier_s_credits", v)}
            />
            <Divider />
            <SettingRow
              label={`Medium bottle (${settings.credit_tier_s_max_ml}–${settings.credit_tier_m_max_ml}ml)`}
              min={1}
              step={1}
              sub="Credits per deposit"
              unit="cr"
              value={settings.credit_tier_m_credits}
              onChange={(v) => set("credit_tier_m_credits", v)}
            />
            <Divider />
            <SettingRow
              label={`Large bottle (>${settings.credit_tier_m_max_ml}ml)`}
              min={1}
              step={1}
              sub="Credits per deposit"
              unit="cr"
              value={settings.credit_tier_l_credits}
              onChange={(v) => set("credit_tier_l_credits", v)}
            />
          </Card>

          <Card withBorder p="lg" radius="md">
            <Text fw={700} size="sm">
              Volume Thresholds (ml)
            </Text>
            <Text c="dimmed" mb="xs" size="xs">
              Define where S/M/L boundaries fall.
            </Text>
            <Divider />
            <SettingRow
              label="S/M boundary"
              min={100}
              step={50}
              sub="Max ml for Small"
              unit="ml"
              value={settings.credit_tier_s_max_ml}
              onChange={(v) => set("credit_tier_s_max_ml", v)}
            />
            <Divider />
            <SettingRow
              label="M/L boundary"
              min={200}
              step={50}
              sub="Max ml for Medium"
              unit="ml"
              value={settings.credit_tier_m_max_ml}
              onChange={(v) => set("credit_tier_m_max_ml", v)}
            />
          </Card>

          <Card withBorder p="lg" radius="md">
            <Text fw={700} size="sm">
              Charging Settings
            </Text>
            <Text c="dimmed" mb="xs" size="xs">
              Controls how long each credit lasts and energy budget per credit.
            </Text>
            <Divider />
            <SettingRow
              label="Energy budget per credit"
              min={1}
              step={0.5}
              sub="Actual Wh allocated; dynamic duration based on real draw"
              unit="Wh"
              value={settings.energy_budget_wh_per_credit}
              onChange={(v) => set("energy_budget_wh_per_credit", v)}
            />
            <Divider />
            <SettingRow
              label="Base minutes per credit"
              min={1}
              step={1}
              sub="Fallback when no telemetry available"
              unit="min"
              value={settings.base_minutes_per_credit}
              onChange={(v) => set("base_minutes_per_credit", v)}
            />
            <Divider />
            <SettingRow
              label="Max charging duration"
              min={60}
              step={60}
              sub="Hard cap regardless of credits"
              unit="sec"
              value={settings.max_charging_seconds}
              onChange={(v) => set("max_charging_seconds", v)}
            />
          </Card>

          <Card withBorder p="lg" radius="md">
            <Text fw={700} size="sm">
              Economics
            </Text>
            <Text c="dimmed" mb="xs" size="xs">
              Used to calculate gain/loss in analytics.
            </Text>
            <Divider />
            <SettingRow
              label="Electricity rate"
              min={1}
              step={0.1}
              sub="Meralco / local utility rate"
              unit="₱/kWh"
              value={settings.electricity_rate_php_per_kwh}
              onChange={(v) => set("electricity_rate_php_per_kwh", v)}
            />
          </Card>

          <Button
            color="ecoGreen"
            loading={saving}
            size="md"
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </Stack>
      </Skeleton>
    </Stack>
  );
}
