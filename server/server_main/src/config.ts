import { z } from 'zod'
import dotenv from 'dotenv'
dotenv.config()

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1).default('dev-jwt-secret'),
  JWT_EXPIRES_IN: z.string().default('60m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  DEVICE_API_KEY: z.string().default('esp32-device-secret'),
  AI_SERVER_URL: z.string().default(''),
  AI_API_KEY: z.string().default(''),
  SUPABASE_URL: z.string().default(''),
  SUPABASE_SERVICE_KEY: z.string().default(''),
  SUPABASE_BUCKET: z.string().default('ecocharge_bucket'),
})

export const config = schema.parse(process.env)
