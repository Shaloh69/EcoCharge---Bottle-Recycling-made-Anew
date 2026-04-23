import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AuthRequest } from "../types";

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  // Accept token from Authorization header OR ?token= query param (needed for SSE / EventSource)
  const headerToken = (req.headers.authorization ?? "")
    .replace("Bearer ", "")
    .trim();
  const queryToken =
    typeof req.query.token === "string" ? req.query.token.trim() : "";
  const token = headerToken || queryToken;

  if (!token) {
    console.warn(
      `[Auth] 401 NO TOKEN — ${req.method} ${req.path} origin=${req.headers.origin ?? "?"}`,
    );
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as {
      sub: string;
      isAdmin?: boolean;
    };
    req.userId = parseInt(payload.sub);
    req.isAdmin = payload.isAdmin ?? false;
    next();
  } catch (err) {
    const reason = (err as Error).message ?? "unknown";
    console.warn(
      `[Auth] 401 INVALID TOKEN — ${req.method} ${req.path} reason="${reason}" token_prefix="${token.slice(0, 12)}..."`,
    );
    res.status(401).json({ error: "invalid token" });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  requireAuth(req, res, () => {
    if (!req.isAdmin) {
      res.status(403).json({ error: "admin only" });
      return;
    }
    next();
  });
}
