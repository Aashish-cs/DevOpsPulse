import "dotenv/config";
import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => (value === "" ? undefined : value);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET should be at least 32 characters"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET should be hard to guess"),
  FRONTEND_URL: z.string().url(),
  RESEND_API_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  PASSWORD_RESET_FROM_EMAIL: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).default("DevOpsPulse <onboarding@resend.dev>")
  ),
  PASSWORD_RESET_EXPOSE_LINKS: z.preprocess(
    emptyStringToUndefined,
    z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true")
  )
});

export const env = envSchema.parse(process.env);
