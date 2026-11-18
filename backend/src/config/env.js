import "dotenv/config";
import { z } from "zod";

// Every environment variable the API needs is checked here, once, at start up.
// Add new variables to this schema AND to .env.example.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:5174"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("\nInvalid environment configuration (check your .env file):");
  parsed.error.issues.forEach((issue) => console.error(`  - ${issue.path.join(".")}: ${issue.message}`));
  console.error("");
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
};
