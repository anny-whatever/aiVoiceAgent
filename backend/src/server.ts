import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { loadDrivingData } from "./lib/drivingData";
import { ENV } from "./config/env";
import sessionRouter from "./routes/session";
import toolsRouter from "./routes/tools";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Security-ish middleware
app.use(
  cors({
    origin: [ENV.FRONTEND_URL],
    credentials: true,
  })
);
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
  })
);

// Load data on boot
try {
  loadDrivingData(__dirname);
  console.log("✅ Driving data loaded");
} catch (err) {
  console.error("❌ Failed to load driving data:", err);
  process.exit(1);
}

// Health
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// API routes
app.use("/api", sessionRouter);
app.use("/api", toolsRouter);

// Agent status
app.get("/api/agent", (_req, res) => {
  res.json({
    name: "Drival",
    status: "active",
    dataType: "personal_trip_history",
  });
});

app.listen(ENV.PORT, () => {
  console.log(`🚀 Drival server running on http://localhost:${ENV.PORT}`);
});
