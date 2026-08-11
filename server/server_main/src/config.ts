import path from "path";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1).default("dev-jwt-secret"),
  JWT_EXPIRES_IN: z.string().default("4h"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  DEVICE_API_KEY: z.string().default("esp32-device-secret"),
  // Comma-separated list of allowed CORS origins, e.g.:
  // https://ecocharge-kiosk.onrender.com,https://ecocharge-admin.onrender.com
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:3001"),
  AI_SERVER_URL: z.string().default(""),
  AI_API_KEY: z.string().default(""),
  // Local-disk media storage (avatars, etc.) — served back out via /media.
  // Default is a folder next to the running process; set to an absolute
  // path (e.g. D:\EcoCharge\media) when running as the persistent service.
  MEDIA_STORAGE_PATH: z.string().default(path.join(process.cwd(), "media")),
  // Mobile-app version gate (see GET /api/app-config, and
  // docs/planning/06-must-have-app-features.md). Two tiers on purpose:
  //   MIN_APP_VERSION    — below this the app hard-blocks; it cannot be dismissed.
  //   LATEST_APP_VERSION — below this the app shows a dismissible nudge.
  // Raise MIN_APP_VERSION only for genuinely breaking API changes, since it
  // strands anyone who can't update immediately. The app is sideloaded (no
  // Play Store), so the update path is the website's /download page.
  MIN_APP_VERSION: z.string().default("1.0.0"),
  LATEST_APP_VERSION: z.string().default("1.0.0"),
  APP_DOWNLOAD_URL: z.string().default(""),
});

export const config = schema.parse(process.env);
