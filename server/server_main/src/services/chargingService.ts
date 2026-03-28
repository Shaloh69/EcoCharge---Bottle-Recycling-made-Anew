import prisma from '../prisma'
import { getSettings, n } from './settingsService'

export async function calcDurationSeconds(
  kioskId: number, portNumber: number, credits: number
): Promise<{ durationSeconds: number; wattSnapshot: number | null }> {
  const s = await getSettings()
  const latest = await prisma.deviceTelemetry.findFirst({
    where: { kioskId }, orderBy: { timestamp: 'desc' },
  })
  let wattSnapshot: number | null = null
  let durationSeconds: number

  if (latest?.portData) {
    const ports: Array<{ voltage?: number; current?: number }> = JSON.parse(latest.portData)
    const port = ports[portNumber - 1]
    if (port?.voltage && port?.current && port.voltage > 0 && port.current > 0) {
      wattSnapshot = port.voltage * port.current
      const whBudget = credits * n(s, 'energy_budget_wh_per_credit')
      durationSeconds = Math.round((whBudget * 3600) / wattSnapshot)
    } else {
      durationSeconds = credits * n(s, 'base_minutes_per_credit') * 60
    }
  } else {
    durationSeconds = credits * n(s, 'base_minutes_per_credit') * 60
  }

  durationSeconds = Math.min(durationSeconds, n(s, 'max_charging_seconds'))
  return { durationSeconds, wattSnapshot }
}
