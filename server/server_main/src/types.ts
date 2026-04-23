import { Request } from "express";

export interface AuthRequest extends Request {
  userId?: number;
  isAdmin?: boolean;
}

export interface DeviceRequest extends Request {
  kioskId?: number;
  kiosk?: { id: number; name: string; apiKey: string };
}
