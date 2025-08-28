import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path, { join } from "path";

import { validateApiKey } from "./middleware/sessionMiddleware";
import toolsRoutes from "./routes/tools";

dotenv.config();

// Use CommonJS globals
const FILE_NAME = __filename;
const DIR_NAME = path.dirname(__filename);

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
