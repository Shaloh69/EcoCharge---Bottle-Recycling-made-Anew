import prisma from '../prisma'
import { getSettings, n } from './settingsService'

export async function creditsForVolume(volumeMl: number): Promise<number> {
  const s = await getSettings()
  if (volumeMl <= n(s, 'credit_tier_s_max_ml')) return n(s, 'credit_tier_s_credits')
  if (volumeMl <= n(s, 'credit_tier_m_max_ml')) return n(s, 'credit_tier_m_credits')
  return n(s, 'credit_tier_l_credits')
}

export async function awardCredits(
  userId: number, amount: number, refType: string, refId: number
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { creditBalance: { increment: amount } },
  })
  return prisma.creditTransaction.create({
    data: { userId, type: 'EARN', amount, balanceAfter: user.creditBalance, refType, refId },
  })
}

export async function spendCredits(
  userId: number, amount: number, refType: string, refId: number
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (user.creditBalance < amount) throw new Error('Insufficient credits')
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { creditBalance: { decrement: amount } },
  })
  return prisma.creditTransaction.create({
    data: { userId, type: 'SPEND', amount, balanceAfter: updated.creditBalance, refType, refId },
  })
}
