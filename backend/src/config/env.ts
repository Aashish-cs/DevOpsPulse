import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET should be at least 32 characters"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET should be hard to guess"),
  FRONTEND_URL: z.string().url()
});

export const env = envSchema.parse(process.env);
