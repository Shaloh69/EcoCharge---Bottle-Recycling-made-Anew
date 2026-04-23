import { Response, NextFunction } from "express";
import prisma from "../prisma";
import { log } from "../logger";
import { DeviceRequest } from "../types";

export async function requireDeviceKey(
  req: DeviceRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const raw = (req.headers.authorization ?? "").trim();
  const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : raw;

  if (!token) {
    log.deviceWarn(`AUTH FAILED — no Authorization header | ip=${req.ip} path=${req.path}`);
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const kiosk = await prisma.kiosk.findUnique({ where: { apiKey: token } });

  if (!kiosk) {
    log.deviceWarn(
      `AUTH FAILED — unknown api_key="${token.slice(0, 8)}…" | ip=${req.ip} path=${req.path}`,
    );
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  log.device(`AUTH OK — kiosk #${kiosk.id} "${kiosk.name}" | ${req.method} ${req.path}`);
  req.kiosk = kiosk;
  req.kioskId = kiosk.id;
  next();
}
