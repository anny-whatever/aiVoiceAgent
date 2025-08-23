import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 3001,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
};

if (!ENV.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}
