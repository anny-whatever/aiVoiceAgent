import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { validateApiKey } from "./middleware/sessionMiddleware.js";
import apiRoutes from "./routes/api.js";
import toolsRoutes from "./routes/tools.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    // origin: process.env.FRONTEND_URL || "http://localhost:5173",
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);
app.use('/api/tools', toolsRoutes);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// User listing endpoint removed for security - users should not be exposed

// Session creation is now handled by the session router with proper usage tracking







// Start server
app.listen(PORT, () => {
  console.log(`🚀 Drival server running on port ${PORT}`);
});

export default app;
