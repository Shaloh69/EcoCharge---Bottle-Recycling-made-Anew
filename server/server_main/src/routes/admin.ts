import crypto from "crypto";
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { requireAdmin } from "../middleware/auth";
import {
  addAdminClient,
  sseHeaders,
  broadcastToAdmin,
} from "../services/sseService";
import {
  getSettings,
  n,
  invalidateSettingsCache,
  SETTING_DEFAULTS,
} from "../services/settingsService";
import { queueCommand, cancelKioskCommands } from "../services/commandService";
import { log } from "../logger";
import { AuthRequest } from "../types";

const router = Router();

router.use(requireAdmin);

// Pagination helper
function paginate<T>(items: T[], total: number, page: number, perPage: number) {
  return { items, total, pages: Math.ceil(total / perPage), page };
}

// GET /overview
router.get(
  "/overview",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      log.admin("Fetching overview stats");
      const [
        totalUsers,
        totalDeposits,
        activeCharging,
        totalCreditsEarned,
        kiosksOnline,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.bottleDeposit.count(),
        prisma.chargingSession.count({ where: { status: "active" } }),
        prisma.creditTransaction.aggregate({
          where: { type: "EARN" },
          _sum: { amount: true },
        }),
        prisma.kiosk.count({ where: { status: "online" } }),
      ]);

      log.admin(
        `Overview — users=${totalUsers} deposits=${totalDeposits} charging=${activeCharging} kiosksOnline=${kiosksOnline}`,
      );
      res.json({
        total_users: totalUsers,
        total_deposits: totalDeposits,
        active_charging: activeCharging,
        total_credits_earned: totalCreditsEarned._sum.amount ?? 0,
        kiosks_online: kiosksOnline,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /kiosks
router.get(
  "/kiosks",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const kiosks = await prisma.kiosk.findMany({ orderBy: { name: "asc" } });
      res.json(
        kiosks.map((k) => ({
          id: k.id,
          name: k.name,
          location: k.location,
          api_key: k.apiKey,
          status: k.status,
          last_seen_at: k.lastSeenAt,
          created_at: k.createdAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// GET /kiosks/:id/telemetry/latest
router.get(
  "/kiosks/:id/telemetry/latest",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kioskId = parseInt(req.params.id);
      const telemetry = await prisma.deviceTelemetry.findFirst({
        where: { kioskId },
        orderBy: { timestamp: "desc" },
      });
      if (!telemetry) {
        res.status(404).json({ error: "no telemetry found" });
        return;
      }
      res.json({
        id: telemetry.id,
        kiosk_id: telemetry.kioskId,
        port_data: telemetry.portData
          ? (() => {
              try {
                return JSON.parse(telemetry.portData!);
              } catch {
                return null;
              }
            })()
          : null,
        bin_level: telemetry.binLevel,
        timestamp: telemetry.timestamp,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /sessions
router.get(
  "/sessions",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const sessions = await prisma.kioskSession.findMany({
        orderBy: { startedAt: "desc" },
        take: 100,
        include: {
          user: { select: { name: true, email: true } },
          kiosk: { select: { name: true } },
        },
      });
      res.json(
        sessions.map((s) => ({
          id: s.id,
          user_id: s.userId,
          kiosk_id: s.kioskId,
          started_at: s.startedAt,
          ended_at: s.endedAt,
          user: s.user,
          kiosk: s.kiosk,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// GET /deposits?page=1
router.get(
  "/deposits",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) ?? "1"));
      const perPage = 50;
      const skip = (page - 1) * perPage;

      const [deposits, total] = await Promise.all([
        prisma.bottleDeposit.findMany({
          orderBy: { timestamp: "desc" },
          skip,
          take: perPage,
        }),
        prisma.bottleDeposit.count(),
      ]);

      const items = deposits.map((d) => ({
        id: d.id,
        session_id: d.sessionId,
        brand: d.brand,
        volume_ml: d.volumeMl,
        condition: d.condition,
        confidence: d.confidence,
        credits_awarded: d.creditsAwarded,
        timestamp: d.timestamp,
      }));

      res.json(paginate(items, total, page, perPage));
    } catch (err) {
      next(err);
    }
  },
);

// GET /charging?page=1&status=
router.get(
  "/charging",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) ?? "1"));
      const statusFilter = req.query.status as string | undefined;
      const perPage = 50;
      const skip = (page - 1) * perPage;

      const where = statusFilter
        ? {
            status: statusFilter as
              | "active"
              | "completed"
              | "interrupted"
              | "error",
          }
        : {};

      const [sessions, total] = await Promise.all([
        prisma.chargingSession.findMany({
          where,
          orderBy: { startedAt: "desc" },
          skip,
          take: perPage,
          include: {
            user: { select: { name: true, email: true } },
            kiosk: { select: { name: true } },
          },
        }),
        prisma.chargingSession.count({ where }),
      ]);

      const items = sessions.map((s) => ({
        id: s.id,
        user_id: s.userId,
        kiosk_id: s.kioskId,
        port_number: s.portNumber,
        credits_used: s.creditsUsed,
        duration_seconds: s.durationSeconds,
        watt_snapshot: s.wattSnapshot,
        started_at: s.startedAt,
        ended_at: s.endedAt,
        status: s.status,
        user: s.user,
        kiosk: s.kiosk,
      }));

      res.json(paginate(items, total, page, perPage));
    } catch (err) {
      next(err);
    }
  },
);

// GET /transactions?page=1
router.get(
  "/transactions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) ?? "1"));
      const perPage = 50;
      const skip = (page - 1) * perPage;

      const [transactions, total] = await Promise.all([
        prisma.creditTransaction.findMany({
          orderBy: { timestamp: "desc" },
          skip,
          take: perPage,
          include: { user: { select: { name: true, email: true } } },
        }),
        prisma.creditTransaction.count(),
      ]);

      const items = transactions.map((t) => ({
        id: t.id,
        user_id: t.userId,
        type: t.type,
        amount: t.amount,
        balance_after: t.balanceAfter,
        ref_type: t.refType,
        ref_id: t.refId,
        timestamp: t.timestamp,
        user: t.user,
      }));

      res.json(paginate(items, total, page, perPage));
    } catch (err) {
      next(err);
    }
  },
);

// GET /users
router.get(
  "/users",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json(
        users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          profile_picture_url: u.profilePictureUrl,
          credit_balance: u.creditBalance,
          is_admin: u.isAdmin,
          created_at: u.createdAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// GET /alerts
router.get(
  "/alerts",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      const kiosks = await prisma.kiosk.findMany();
      const alerts: Array<{
        type: string;
        kiosk_id: number;
        kiosk_name: string;
        message: string;
        severity: string;
      }> = [];

      for (const kiosk of kiosks) {
        // Check offline (last seen > 2 minutes ago or never)
        if (!kiosk.lastSeenAt || kiosk.lastSeenAt < twoMinutesAgo) {
          alerts.push({
            type: "offline",
            kiosk_id: kiosk.id,
            kiosk_name: kiosk.name,
            message: `Kiosk "${kiosk.name}" has been offline for more than 2 minutes`,
            severity: "high",
          });
        }

        // Check bin level
        const latest = await prisma.deviceTelemetry.findFirst({
          where: { kioskId: kiosk.id },
          orderBy: { timestamp: "desc" },
        });
        if (
          latest?.binLevel !== null &&
          latest?.binLevel !== undefined &&
          latest.binLevel >= 80
        ) {
          alerts.push({
            type: "bin_full",
            kiosk_id: kiosk.id,
            kiosk_name: kiosk.name,
            message: `Kiosk "${kiosk.name}" bin level is at ${latest.binLevel}%`,
            severity: latest.binLevel >= 95 ? "critical" : "medium",
          });
        }
      }

      alerts.sort((a, b) => {
        const order: Record<string, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
      });

      res.json(alerts);
    } catch (err) {
      next(err);
    }
  },
);

// GET /ml-review?page=1&threshold=0.70
router.get(
  "/ml-review",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) ?? "1"));
      const threshold = parseFloat((req.query.threshold as string) ?? "0.70");
      const perPage = 50;
      const skip = (page - 1) * perPage;

      const [deposits, total] = await Promise.all([
        prisma.bottleDeposit.findMany({
          where: { confidence: { lt: threshold } },
          orderBy: { timestamp: "desc" },
          skip,
          take: perPage,
        }),
        prisma.bottleDeposit.count({
          where: { confidence: { lt: threshold } },
        }),
      ]);

      const items = deposits.map((d) => ({
        id: d.id,
        session_id: d.sessionId,
        brand: d.brand,
        volume_ml: d.volumeMl,
        condition: d.condition,
        confidence: d.confidence,
        credits_awarded: d.creditsAwarded,
        timestamp: d.timestamp,
      }));

      res.json(paginate(items, total, page, perPage));
    } catch (err) {
      next(err);
    }
  },
);

// GET /settings
router.get(
  "/settings",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await prisma.systemSetting.findMany();
      const settings: Record<string, string> = { ...SETTING_DEFAULTS };
      for (const row of rows) settings[row.key] = row.value;
      res.json({ settings });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /settings
const settingsBodySchema = z.object({
  settings: z.record(z.string()),
});

router.put(
  "/settings",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = settingsBodySchema.parse(req.body);
      const keys = Object.keys(body.settings);
      log.admin(`Settings UPDATE — keys: ${keys.join(", ")}`);
      for (const [key, value] of Object.entries(body.settings)) {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
      invalidateSettingsCache();
      log.admin("Settings updated and cache invalidated");

      // Return updated settings
      const rows = await prisma.systemSetting.findMany();
      const settings: Record<string, string> = { ...SETTING_DEFAULTS };
      for (const row of rows) settings[row.key] = row.value;
      res.json({ settings });
    } catch (err) {
      next(err);
    }
  },
);

// GET /analytics?days=30
router.get(
  "/analytics",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Math.max(1, parseInt((req.query.days as string) ?? "30"));
      const s = await getSettings();
      const electricityRate = n(s, "electricity_rate_php_per_kwh");
      const energyBudgetWhPerCredit = n(s, "energy_budget_wh_per_credit");

      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [chargingSessions, earnTransactions] = await Promise.all([
        prisma.chargingSession.findMany({
          where: { status: "completed", startedAt: { gte: since } },
          select: {
            startedAt: true,
            wattSnapshot: true,
            durationSeconds: true,
          },
        }),
        prisma.creditTransaction.findMany({
          where: { type: "EARN", timestamp: { gte: since } },
          select: { timestamp: true, amount: true },
        }),
      ]);

      // Build date map
      const dateMap: Record<
        string,
        { kwh_consumed: number; credits_issued: number }
      > = {};

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split("T")[0];
        dateMap[dateStr] = { kwh_consumed: 0, credits_issued: 0 };
      }

      for (const session of chargingSessions) {
        const dateStr = session.startedAt.toISOString().split("T")[0];
        if (!dateMap[dateStr])
          dateMap[dateStr] = { kwh_consumed: 0, credits_issued: 0 };
        if (session.wattSnapshot && session.durationSeconds) {
          dateMap[dateStr].kwh_consumed +=
            (session.wattSnapshot * session.durationSeconds) / 3600 / 1000;
        }
      }

      for (const tx of earnTransactions) {
        const dateStr = tx.timestamp.toISOString().split("T")[0];
        if (!dateMap[dateStr])
          dateMap[dateStr] = { kwh_consumed: 0, credits_issued: 0 };
        dateMap[dateStr].credits_issued += tx.amount;
      }

      const analytics = Object.entries(dateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => {
          const cost_php = data.kwh_consumed * electricityRate;
          const gain_php =
            ((data.credits_issued * energyBudgetWhPerCredit) / 1000) *
              electricityRate -
            cost_php;
          return {
            date,
            kwh_consumed: Math.round(data.kwh_consumed * 10000) / 10000,
            credits_issued: data.credits_issued,
            cost_php: Math.round(cost_php * 100) / 100,
            gain_php: Math.round(gain_php * 100) / 100,
          };
        });

      res.json(analytics);
    } catch (err) {
      next(err);
    }
  },
);

// POST /kiosks — create
router.post(
  "/kiosks",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, location } = z
        .object({
          name: z.string().min(1),
          location: z.string().min(1),
        })
        .parse(req.body);

      const apiKey = crypto.randomBytes(24).toString("hex");
      const kiosk = await prisma.kiosk.create({
        data: { name, location, apiKey },
      });
      log.admin(`Kiosk created — #${kiosk.id} "${kiosk.name}"`);
      res.json({
        id: kiosk.id,
        name: kiosk.name,
        location: kiosk.location,
        api_key: kiosk.apiKey,
        status: kiosk.status,
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /kiosks/:id — update name/location
router.put(
  "/kiosks/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const body = z
        .object({
          name: z.string().min(1).optional(),
          location: z.string().min(1).optional(),
        })
        .parse(req.body);

      const kiosk = await prisma.kiosk.update({ where: { id }, data: body });
      log.admin(
        `Kiosk #${id} updated — name="${kiosk.name}" location="${kiosk.location}"`,
      );
      res.json({
        id: kiosk.id,
        name: kiosk.name,
        location: kiosk.location,
        status: kiosk.status,
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /kiosks/:id
router.delete(
  "/kiosks/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await prisma.kiosk.delete({ where: { id } });
      log.admin(`Kiosk #${id} deleted`);
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  },
);

// POST /kiosks/:id/command — queue any command from admin
const commandSchema = z.object({
  command_type: z.enum([
    "activate_port",
    "deactivate_port",
    "open_conveyor",
    "close_conveyor",
    "reverse_conveyor",
    "approve_bottle",
    "reject_bottle",
    "ping",
  ]),
  payload: z.record(z.unknown()).optional(),
});

// DELETE /kiosks/:id/commands/pending — cancel all stale pending commands
router.delete(
  "/kiosks/:id/commands/pending",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const result = await cancelKioskCommands(id);
      log.admin(`Cancelled ${result.count} pending commands for kiosk #${id}`);
      res.json({ cancelled: result.count });
    } catch (err) {
      next(err);
    }
  },
);

// POST /kiosks/:id/command — queue any command from admin
router.post(
  "/kiosks/:id/command",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { command_type, payload } = commandSchema.parse(req.body);

      const kiosk = await prisma.kiosk.findUnique({ where: { id } });
      if (!kiosk) {
        res.status(404).json({ error: "kiosk not found" });
        return;
      }

      const cmd = await queueCommand(id, command_type, payload);
      log.admin(
        `Command queued — kiosk #${id} type=${command_type} payload=${JSON.stringify(payload ?? {})}`,
      );
      res.json({ command_id: cmd.id, command_type, queued: true });
    } catch (err) {
      next(err);
    }
  },
);

// GET /kiosks/:id/commands — command audit log
router.get(
  "/kiosks/:id/commands",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const limit = Math.min(
        parseInt((req.query.limit as string) || "50"),
        200,
      );

      const commands = await prisma.deviceCommand.findMany({
        where: { kioskId: id },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      res.json(
        commands.map((c) => ({
          id: c.id,
          command_type: c.commandType,
          payload: c.payload
            ? (() => {
                try {
                  return JSON.parse(c.payload!);
                } catch {
                  return {};
                }
              })()
            : {},
          status: c.status,
          created_at: c.createdAt,
          acked_at: c.ackedAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// GET /sse
router.get(
  "/sse",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      log.admin(
        `SSE client connected — user #${(req as AuthRequest).userId ?? "unknown"}`,
      );
      sseHeaders(res);
      addAdminClient(res);

      res.on("close", () => {
        log.admin("SSE client disconnected");
      });

      // Send initial overview
      const [
        totalUsers,
        totalDeposits,
        activeCharging,
        totalCreditsEarned,
        kiosksOnline,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.bottleDeposit.count(),
        prisma.chargingSession.count({ where: { status: "active" } }),
        prisma.creditTransaction.aggregate({
          where: { type: "EARN" },
          _sum: { amount: true },
        }),
        prisma.kiosk.count({ where: { status: "online" } }),
      ]);

      const overviewPayload = {
        type: "overview",
        total_users: totalUsers,
        total_deposits: totalDeposits,
        active_charging: activeCharging,
        total_credits_earned: totalCreditsEarned._sum.amount ?? 0,
        kiosks_online: kiosksOnline,
      };

      res.write(`data: ${JSON.stringify(overviewPayload)}\n\n`);
    } catch (err) {
      next(err);
    }
  },
);

export { broadcastToAdmin };
export default router;
