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
});

export const config = schema.parse(process.env);
