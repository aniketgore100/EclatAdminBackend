import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  // Shorter than the storefront's customer session TTL (30 days) — admin
  // access is more sensitive, shorter-lived sessions are the safer default.
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  // S3 image upload — optional at boot; the upload endpoint fails clearly
  // (not the whole app) if these are missing when actually used.
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // Comma-separated origins allowed to call this API from a browser (the
  // admin frontend's dev server, and later its real deployed URL).
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
