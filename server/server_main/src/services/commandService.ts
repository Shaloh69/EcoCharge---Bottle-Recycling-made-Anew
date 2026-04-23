import prisma from "../prisma";

const COMMAND_TTL_MS = 5 * 60 * 1000; // 5 minutes — commands older than this are expired

export async function queueCommand(
  kioskId: number,
  commandType: string,
  payload?: object,
) {
  return prisma.deviceCommand.create({
    data: {
      kioskId,
      commandType,
      payload: payload ? JSON.stringify(payload) : null,
    },
  });
}

export async function getPendingCommands(kioskId: number) {
  // Auto-expire stale PENDING commands so the ESP is never flooded with old test commands
  const expireBefore = new Date(Date.now() - COMMAND_TTL_MS);
  await prisma.deviceCommand.updateMany({
    where: { kioskId, status: "PENDING", createdAt: { lt: expireBefore } },
    data: { status: "EXPIRED" },
  });

  return prisma.deviceCommand.findMany({
    where: { kioskId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 5, // max 5 commands per poll — prevents serial ack backlog on the ESP
  });
}

export async function ackCommand(commandId: number, kioskId: number) {
  return prisma.deviceCommand.updateMany({
    where: { id: commandId, kioskId, status: "PENDING" },
    data: { status: "ACKED", ackedAt: new Date() },
  });
}

export async function cancelKioskCommands(kioskId: number) {
  return prisma.deviceCommand.updateMany({
    where: { kioskId, status: "PENDING" },
    data: { status: "EXPIRED" },
  });
}
