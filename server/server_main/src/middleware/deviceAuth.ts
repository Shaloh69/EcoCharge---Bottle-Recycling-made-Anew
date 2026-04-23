import { Response, NextFunction } from "express";
import prisma from "../prisma";
import { DeviceRequest } from "../types";

export async function requireDeviceKey(
  req: DeviceRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "").trim();

  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const kiosk = await prisma.kiosk.findUnique({ where: { apiKey: token } });

  if (!kiosk) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  req.kiosk = kiosk;
  req.kioskId = kiosk.id;
  next();
}
