import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import type { Response, NextFunction } from "express";
import { requireAuth, requireAdmin } from "./auth";
import { config } from "../config";
import type { AuthRequest } from "../types";

// Covers docs/planning/03-revamp-master.md §2 item 4 (unauthenticated kiosk
// read endpoints, fixed 2026-08-10): requireAuth gates every kiosk detail
// route now, including via the ?token= query param the SSE route needs
// (EventSource can't set an Authorization header). This test exists to
// keep both the header and query-param paths — and the reject cases —
// from silently regressing.

function makeReq(opts: {
  authHeader?: string;
  queryToken?: string;
}): AuthRequest {
  return {
    headers: opts.authHeader ? { authorization: opts.authHeader } : {},
    query: opts.queryToken ? { token: opts.queryToken } : {},
  } as unknown as AuthRequest;
}

function makeRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function sign(payload: object) {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: "1h" });
}

describe("requireAuth", () => {
  it("rejects with 401 when no token is present at all", () => {
    const req = makeReq({});
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects with 401 on a malformed/invalid token", () => {
    const req = makeReq({ authHeader: "Bearer not-a-real-jwt" });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a valid token via the Authorization header and sets userId/isAdmin", () => {
    const token = sign({ sub: "42", isAdmin: false });
    const req = makeReq({ authHeader: `Bearer ${token}` });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe(42);
    expect(req.isAdmin).toBe(false);
  });

  it("accepts a valid token via ?token= query param (the SSE/EventSource path)", () => {
    const token = sign({ sub: "7", isAdmin: false });
    const req = makeReq({ queryToken: token });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe(7);
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign({ sub: "1" }, config.JWT_SECRET, {
      expiresIn: -10,
    });
    const req = makeReq({ authHeader: `Bearer ${expired}` });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireAdmin", () => {
  it("rejects with 403 for a valid but non-admin token", () => {
    const token = sign({ sub: "5", isAdmin: false });
    const req = makeReq({ authHeader: `Bearer ${token}` });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows a valid admin token through", () => {
    const token = sign({ sub: "1", isAdmin: true });
    const req = makeReq({ authHeader: `Bearer ${token}` });
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
