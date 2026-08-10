import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { guestSessionRateLimit, loginRateLimit } from "./rateLimit";

// Covers docs/planning/03-revamp-master.md §2's "guest pooled balance"
// mitigation (memory.md, 2026-08-10): guest deposits share one pooled
// account, so a per-IP rate limit on session creation is the actual
// abuse control — this test exists to keep that control from silently
// regressing (e.g. a future refactor that keys by the wrong field, or
// drops the 429 entirely).

function makeReq(ip: string): Request {
  return { ip } as Request;
}

function makeRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("guestSessionRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first 5 guest sessions from one IP", () => {
    const ip = "203.0.113.1";
    for (let i = 0; i < 5; i++) {
      const req = makeReq(ip);
      const res = makeRes();
      const next = vi.fn() as unknown as NextFunction;
      guestSessionRateLimit(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  it("rejects the 6th guest session from the same IP within the window", () => {
    const ip = "203.0.113.2";
    for (let i = 0; i < 5; i++) {
      guestSessionRateLimit(makeReq(ip), makeRes(), vi.fn() as unknown as NextFunction);
    }
    const req = makeReq(ip);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    guestSessionRateLimit(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("does not let one IP's usage affect a different IP", () => {
    const busyIp = "203.0.113.3";
    for (let i = 0; i < 5; i++) {
      guestSessionRateLimit(makeReq(busyIp), makeRes(), vi.fn() as unknown as NextFunction);
    }
    const otherReq = makeReq("203.0.113.4");
    const otherRes = makeRes();
    const otherNext = vi.fn() as unknown as NextFunction;
    guestSessionRateLimit(otherReq, otherRes, otherNext);
    expect(otherNext).toHaveBeenCalledOnce();
    expect(otherRes.status).not.toHaveBeenCalled();
  });

  it("allows requests again once the 15-minute window fully elapses", () => {
    const ip = "203.0.113.5";
    for (let i = 0; i < 5; i++) {
      guestSessionRateLimit(makeReq(ip), makeRes(), vi.fn() as unknown as NextFunction);
    }
    // Confirm the 6th is blocked before advancing time
    const blockedRes = makeRes();
    guestSessionRateLimit(makeReq(ip), blockedRes, vi.fn() as unknown as NextFunction);
    expect(blockedRes.status).toHaveBeenCalledWith(429);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    const req = makeReq(ip);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    guestSessionRateLimit(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// Covers the admin-console tunnel decision (memory.md, 2026-08-11): once
// /api/auth/login is reachable from the public internet, it's the real
// brute-force surface against admin credentials — this test exists to keep
// that control from silently regressing, same rationale as the guest tests.
describe("loginRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first 10 login attempts from one IP", () => {
    const ip = "198.51.100.1";
    for (let i = 0; i < 10; i++) {
      const req = makeReq(ip);
      const res = makeRes();
      const next = vi.fn() as unknown as NextFunction;
      loginRateLimit(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  it("rejects the 11th login attempt from the same IP within the window", () => {
    const ip = "198.51.100.2";
    for (let i = 0; i < 10; i++) {
      loginRateLimit(makeReq(ip), makeRes(), vi.fn() as unknown as NextFunction);
    }
    const req = makeReq(ip);
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    loginRateLimit(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("does not let one IP's login attempts affect a different IP", () => {
    const busyIp = "198.51.100.3";
    for (let i = 0; i < 10; i++) {
      loginRateLimit(makeReq(busyIp), makeRes(), vi.fn() as unknown as NextFunction);
    }
    const otherReq = makeReq("198.51.100.4");
    const otherRes = makeRes();
    const otherNext = vi.fn() as unknown as NextFunction;
    loginRateLimit(otherReq, otherRes, otherNext);
    expect(otherNext).toHaveBeenCalledOnce();
    expect(otherRes.status).not.toHaveBeenCalled();
  });
});
