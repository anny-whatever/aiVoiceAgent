import { Router } from "express";
import fetch from "node-fetch";
import { ENV } from "../config/env";
import { usageService } from "../lib/usageService.js";
import { validateApiKey, sessionCors, addSessionHeaders } from "../middleware/sessionMiddleware.js";


const router = Router();

// Apply middleware
router.use(sessionCors);
router.use(addSessionHeaders);

/**
 * Creates an ephemeral Realtime session secret for the browser with usage tracking.
 * NOTE: We *never* send OPENAI_API_KEY to the browser.
 */
router.post("/session", validateApiKey, async (req, res) => {
  try {
    const { userId } = req.body;
    const ipAddress = req.ip || 'unknown';

    if (!userId) {
      return res.status(400).json({
        error: "Missing userId",
        message: "userId is required in request body",
      });
    }

    // Validate session creation
    const validation = await usageService.validateSessionCreation(userId, ipAddress);
    
    if (!validation.allowed) {
      return res.status(429).json({
        error: 'Session creation denied',
        reason: validation.reason,
        quotaRemaining: validation.quotaRemaining,
        sessionTimeRemaining: validation.sessionTimeRemaining,
      });
    }

    // User validation removed - getUserData function not available
    const userData = { 
      userId,
      instructions: "You are Drival, a helpful AI assistant for drivers. You can help with mood assessment, driving data analysis, user information, and vehicle information."
    };

    // Get user stats for session info
    const userStats = await usageService.getUserStats(userId);

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1", // not strictly required here, but harmless
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        tools: [],
        instructions: `${userData.instructions}\n\nStart the conversation by asking the user how they're feeling today to assess their mood. Use the assess_user_mood tool to analyze their response and adapt your tone accordingly.\n\nYour session has a time limit of ${Math.floor(validation.sessionTimeRemaining / 60)} minutes. If you receive an END_SESSION action from any tool call, you must immediately end the conversation politely.`,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      const status = r.status;
      const msg =
        status === 401
          ? "Invalid OpenAI API key or insufficient permissions"
          : status === 403
          ? "API key does not have Realtime API access"
          : "Failed to create session";
      return res.status(status === 401 || status === 403 ? 401 : 500).json({
        error: `OpenAI API Error (${status})`,
        message: msg,
        details: text,
      });
    }

    const payload = (await r.json()) as any;
    
    // Create usage tracking session
    const sessionResult = await usageService.createSession(userId, ipAddress);
    
    if (!sessionResult) {
      return res.status(429).json({
        error: "Session creation failed",
        message: "Unable to create session due to usage limits",
      });
    }

    return res.json({
      apiKey: payload.client_secret.value,
      sessionId: payload.id,
      sessionToken: sessionResult.token,
      quotaRemaining: sessionResult.quotaRemaining,
      sessionTimeLimit: validation.sessionTimeRemaining, // Use initial session time as total limit
      warningThreshold: validation.warningThreshold,
    });
  } catch (e: any) {
    console.error("Session creation error:", e);
    return res.status(500).json({
      error: "Failed to create session",
      message: e?.message || "Unknown error",
    });
  }
});

export default router;
