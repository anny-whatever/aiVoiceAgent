import express from "express";
import cors from "cors";
import path from "path";

import { ENV } from "./config/env";
import sessionRouter from "./routes/session";
import toolsRouter from "./routes/tools";
import heartbeatRouter from "./routes/heartbeat";
import { usageService } from "./lib/usageService";
import { websocketMonitor } from "./lib/websocketMonitor";
import { validateApiKey } from "./middleware/sessionMiddleware";

// Use CommonJS globals
const FILE_NAME = __filename;
const DIR_NAME = path.dirname(__filename);


const app = express();

// Security-ish middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());


// Load data and initialize services on boot
async function initializeServer() {
  try {
    // Initialize usage tracking service
    await usageService.initialize();
    console.log("✅ Usage service initialized");
  } catch (err) {
    console.error("❌ Failed to initialize services:", err);
    process.exit(1);
  }
}

// Initialize server
initializeServer();

// Health
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// API routes
app.use("/api", sessionRouter);
app.use("/api", toolsRouter);
app.use("/api", heartbeatRouter);

// Agent status
app.get("/api/agent", validateApiKey, (_req, res) => {
  res.json({
    name: "Drival",
    status: "active",
    dataType: "personal_trip_history",
  });
});

const server = app.listen(ENV.PORT, () => {
  console.log(`🚀 Drival server running on http://localhost:${ENV.PORT}`);
  
  // Initialize WebSocket monitor after server starts
  websocketMonitor.initialize(server);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  server.close(async () => {
    try {
      await websocketMonitor.shutdown();
      await usageService.shutdown();
      console.log('✅ Services shut down');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  
  server.close(async () => {
    try {
      await usageService.shutdown();
      console.log('✅ Usage service shut down');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  try {
    await websocketMonitor.shutdown();
    await usageService.shutdown();
  } catch (shutdownError) {
    console.error('❌ Error during emergency shutdown:', shutdownError);
  }
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  try {
    await usageService.shutdown();
  } catch (shutdownError) {
    console.error('❌ Error during emergency shutdown:', shutdownError);
  }
  process.exit(1);
});
