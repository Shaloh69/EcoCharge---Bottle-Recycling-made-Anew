import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import { log } from "../logger";

// In-memory sliding-window rate limiting, keyed by client IP.
// Single-instance deployment (self-hosted), so no shared store is needed.
// Guest traffic is the abuse surface: self-hosting removes the managed
// platform's implicit mitigation, and the guest account is shared/pooled.

interface Window {
  timestamps: number[];
}

function makeLimiter(windowMs: number, max: number) {
  const buckets = new Map<string, Window>();

  // Periodic cleanup so idle IPs don't accumulate forever
  setInterval(
    () => {
      const cutoff = Date.now() - windowMs;
      for (const [ip, w] of buckets) {
        w.timestamps = w.timestamps.filter((t) => t > cutoff);
        if (w.timestamps.length === 0) buckets.delete(ip);
      }
    },
    5 * 60 * 1000,
  ).unref();

  return (ip: string): boolean => {
    const now = Date.now();
    const cutoff = now - windowMs;
    let w = buckets.get(ip);
    if (!w) {
      w = { timestamps: [] };
      buckets.set(ip, w);
    }
    w.timestamps = w.timestamps.filter((t) => t > cutoff);
    if (w.timestamps.length >= max) return false;
    w.timestamps.push(now);
    return true;
  };
}

const GUEST_SESSION_WINDOW_MS = 15 * 60 * 1000;
const GUEST_SESSION_MAX = 5; // guest sessions per IP per window
const GUEST_ACTION_WINDOW_MS = 15 * 60 * 1000;
const GUEST_ACTION_MAX = 30; // deposits/charging-starts per IP per window

const allowGuestSession = makeLimiter(
  GUEST_SESSION_WINDOW_MS,
  GUEST_SESSION_MAX,
);
const allowGuestAction = makeLimiter(GUEST_ACTION_WINDOW_MS, GUEST_ACTION_MAX);

// Express middleware for POST /api/auth/guest
export function guestSessionRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ip = req.ip ?? "?";
  if (!allowGuestSession(ip)) {
    log.authWarn(`Guest session rate limit hit — ip=${ip}`);
    res.status(429).json({ error: "too many guest sessions, try again later" });
    return;
  }
  next();
}

// The shared guest account id, cached after first lookup.
let _guestUserId: number | null = null;

export async function isGuestUser(userId: number): Promise<boolean> {
  if (_guestUserId !== null) return userId === _guestUserId;
  const guest = await prisma.user.findUnique({
    where: { email: "guest@kiosk.local" },
    select: { id: true },
  });
  if (!guest) return false;
  _guestUserId = guest.id;
  return userId === _guestUserId;
}

// Per-IP limit on guest deposits / charging starts. Returns true if the
// request may proceed (always true for registered users).
export async function guestActionAllowed(
  userId: number,
  ip: string,
): Promise<boolean> {
  if (!(await isGuestUser(userId))) return true;
  return allowGuestAction(ip);
}
