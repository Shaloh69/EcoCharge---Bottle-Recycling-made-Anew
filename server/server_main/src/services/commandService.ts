import prisma from '../prisma'

export async function queueCommand(kioskId: number, commandType: string, payload?: object) {
  return prisma.deviceCommand.create({
    data: { kioskId, commandType, payload: payload ? JSON.stringify(payload) : null },
  })
}

export async function getPendingCommands(kioskId: number) {
  return prisma.deviceCommand.findMany({
    where: { kioskId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  })
}

export async function ackCommand(commandId: number, kioskId: number) {
  return prisma.deviceCommand.updateMany({
    where: { id: commandId, kioskId, status: 'PENDING' },
    data: { status: 'ACKED', ackedAt: new Date() },
  })
}
