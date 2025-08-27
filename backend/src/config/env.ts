import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 3001,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-in-production",
  DATABASE_PATH: process.env.DATABASE_PATH || "./data/usage.db",
  JSON_FALLBACK_PATH: process.env.JSON_FALLBACK_PATH || "./data/usage.json",
};

if (!ENV.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

if (ENV.JWT_SECRET === "dev-secret-change-in-production" && process.env.NODE_ENV === "production") {
  console.warn("⚠️  WARNING: Using default JWT secret in production! Set JWT_SECRET environment variable.");
}
