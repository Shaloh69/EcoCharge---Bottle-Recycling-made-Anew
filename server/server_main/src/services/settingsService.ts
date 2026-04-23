import prisma from "../prisma";

export const SETTING_DEFAULTS: Record<string, string> = {
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

let _cache: Record<string, string> | null = null;
let _cacheAt = 0;
const TTL = 30_000;

export async function getSettings(): Promise<Record<string, string>> {
  if (_cache && Date.now() - _cacheAt < TTL) return _cache;
  const rows = await prisma.systemSetting.findMany();
  const result = { ...SETTING_DEFAULTS };
  for (const r of rows) result[r.key] = r.value;
  _cache = result;
  _cacheAt = Date.now();
  return result;
}

export function n(settings: Record<string, string>, key: string): number {
  return parseFloat(settings[key] ?? SETTING_DEFAULTS[key] ?? "0");
}

export function invalidateSettingsCache(): void {
  _cache = null;
}
