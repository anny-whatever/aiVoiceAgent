import { Router } from "express";
import fetch from "node-fetch";
import { ENV } from "../config/env";
import { getUserData } from "../lib/drivingData";
import { usageService } from "../lib/usageService.js";
import { validateSessionCreation, sessionCors, addSessionHeaders } from "../middleware/sessionMiddleware.js";
import { heartbeatToolDefinition } from "../tools/heartbeat.js";

const router = Router();

// Apply middleware
router.use(sessionCors);
router.use(addSessionHeaders);

/**
 * Creates an ephemeral Realtime session secret for the browser with usage tracking.
 * NOTE: We *never* send OPENAI_API_KEY to the browser.
 */
router.post("/session", validateSessionCreation, async (req, res) => {
  try {
    // Get validation data from middleware
    const { userId, ipAddress, validation } = req.sessionValidation!;

    if (!userId) {
      return res.status(400).json({
        error: "Missing userId",
        message: "userId is required in request body",
      });
    }

    let userData;
    try {
      userData = getUserData(userId);
    } catch (error) {
      return res.status(404).json({
        error: "User not found",
        message: `User ${userId} not found`,
      });
    }

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1", // not strictly required here, but harmless
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-realtime-preview-2024-12-17",
        voice: "alloy",
        // Add mandatory heartbeat tool for usage tracking
        tools: [heartbeatToolDefinition],
        instructions: `${userData.instructions}\n\nIMPORTANT USAGE TRACKING: You MUST call the send_heartbeat function every 60 seconds during our conversation. This tracks usage time and is required for session management. The quotaUsed parameter should be the total seconds of conversation time since we started.\n\nStart the conversation by asking the user how they're feeling today to assess their mood. Use the assess_user_mood tool to analyze their response and adapt your tone accordingly.\n\nYour session has a time limit of ${Math.floor(validation.sessionTimeRemaining / 60)} minutes. If you receive an END_SESSION action from any tool call, you must immediately end the conversation politely.`,
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
      sessionTimeLimit: validation.sessionTimeRemaining,
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
