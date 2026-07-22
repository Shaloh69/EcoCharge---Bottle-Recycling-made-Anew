import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { z } from "zod";
import prisma from "../prisma";
import { config } from "../config";
import { guestSessionRateLimit } from "../middleware/rateLimit";
import { log } from "../logger";
import { User } from "@prisma/client";

const router = Router();

function userToJson(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    profile_picture_url: user.profilePictureUrl,
    credit_balance: user.creditBalance,
    is_admin: user.isAdmin,
    created_at: user.createdAt,
  };
}

function signTokens(user: User) {
  const access_token = jwt.sign(
    { sub: user.id.toString(), isAdmin: user.isAdmin },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions,
  );
  const refresh_token = jwt.sign(
    { sub: user.id.toString(), type: "refresh" },
    config.JWT_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions,
  );
  return { access_token, refresh_token };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

// POST /login
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = loginSchema.parse(req.body);
      log.auth(`LOGIN attempt: ${body.email}`);

      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (!user) {
        log.authWarn(`LOGIN failed — user not found: ${body.email}`);
        res.status(401).json({ error: "invalid credentials" });
        return;
      }

      const valid = await bcrypt.compare(body.password, user.passwordHash);
      if (!valid) {
        log.authWarn(`LOGIN failed — wrong password: ${body.email}`);
        res.status(401).json({ error: "invalid credentials" });
        return;
      }

      log.auth(
        `LOGIN success — user #${user.id} (${user.email}) admin=${user.isAdmin}`,
      );
      const tokens = signTokens(user);
      res.json({ ...tokens, user: userToJson(user) });
    } catch (err) {
      next(err);
    }
  },
);

// POST /register
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = registerSchema.parse(req.body);
      log.auth(`REGISTER attempt: ${body.email}`);

      const existing = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (existing) {
        log.authWarn(`REGISTER failed — email already exists: ${body.email}`);
        res.status(409).json({ error: "email already registered" });
        return;
      }

      const passwordHash = await bcrypt.hash(body.password, 12);
      const qrCode = crypto.randomBytes(16).toString("hex");
      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone ?? null,
          passwordHash,
          qrCode,
        },
      });

      log.auth(`REGISTER success — user #${user.id} (${user.email})`);
      const tokens = signTokens(user);
      res.status(201).json({ ...tokens, user: userToJson(user) });
    } catch (err) {
      next(err);
    }
  },
);

// POST /guest — issues a short-lived JWT for unauthenticated kiosk users.
// Finds or creates a shared "Guest" account so the rest of the deposit flow
// (which requires requireAuth) works without forcing users to register.
// Guest accounts earn credits to a pooled balance that is effectively discarded.
const guestSchema = z.object({
  kiosk_id: z.number().int().positive(),
});

router.post(
  "/guest",
  guestSessionRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = guestSchema.parse(req.body);
      const guestEmail = "guest@kiosk.local";

      // Verify kiosk exists before touching sessions — prevents FK constraint crash
      const kiosk = await prisma.kiosk.findUnique({
        where: { id: body.kiosk_id },
      });
      if (!kiosk) {
        log.authWarn(
          `Guest session rejected — kiosk #${body.kiosk_id} not found`,
        );
        res.status(404).json({ error: `kiosk #${body.kiosk_id} not found` });
        return;
      }

      // Upsert the shared guest user — one per deployment, never deleted
      let guest = await prisma.user.findUnique({
        where: { email: guestEmail },
      });
      if (!guest) {
        const passwordHash = await bcrypt.hash(
          crypto.randomBytes(32).toString("hex"),
          10,
        );
        const qrCode = crypto.randomBytes(16).toString("hex");
        guest = await prisma.user.create({
          data: { name: "Guest", email: guestEmail, passwordHash, qrCode },
        });
        log.auth(`Guest user created — id #${guest.id}`);
      }

      // Create a fresh kiosk session for this guest visit
      const kioskSession = await prisma.kioskSession.create({
        data: { userId: guest.id, kioskId: body.kiosk_id },
      });

      log.auth(
        `Guest session #${kioskSession.id} created for kiosk #${body.kiosk_id}`,
      );

      const access_token = jwt.sign(
        { sub: guest.id.toString(), isAdmin: false },
        config.JWT_SECRET,
        { expiresIn: "4h" } as jwt.SignOptions,
      );

      res.json({
        access_token,
        session_id: kioskSession.id,
        user: userToJson(guest),
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /refresh
router.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = refreshSchema.parse(req.body);
      let payload: { sub: string; type?: string };

      try {
        payload = jwt.verify(body.refresh_token, config.JWT_SECRET) as {
          sub: string;
          type?: string;
        };
      } catch {
        log.authWarn("REFRESH failed — invalid refresh token");
        res.status(401).json({ error: "invalid refresh token" });
        return;
      }

      if (payload.type !== "refresh") {
        log.authWarn("REFRESH failed — wrong token type");
        res.status(401).json({ error: "invalid token type" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: parseInt(payload.sub) },
      });
      if (!user) {
        log.authWarn(`REFRESH failed — user #${payload.sub} not found`);
        res.status(401).json({ error: "user not found" });
        return;
      }

      log.auth(`REFRESH success — user #${user.id}`);
      const access_token = jwt.sign(
        { sub: user.id.toString(), isAdmin: user.isAdmin },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions,
      );
      res.json({ access_token });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
