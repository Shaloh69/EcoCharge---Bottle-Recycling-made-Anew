import { Router, Request, Response } from "express";
import { config } from "../config";

const router = Router();

/**
 * GET /api/app-config
 *
 * Public, unauthenticated, deliberately tiny. The mobile app calls this on
 * launch — before login — to decide whether it may run at all, so it must not
 * require a token and must not depend on the database being reachable.
 *
 * Nothing secret goes in this response. It is world-readable.
 */
router.get("/", (_req: Request, res: Response) => {
  res.json({
    min_version: config.MIN_APP_VERSION,
    latest_version: config.LATEST_APP_VERSION,
    download_url: config.APP_DOWNLOAD_URL,
  });
});

export default router;
