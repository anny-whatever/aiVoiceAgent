import { Router } from "express";
import fetch from "node-fetch";
import { ENV } from "../config/env";
import { usageService } from "../lib/usageService";
import { validateApiKey, sessionCors, addSessionHeaders } from "../middleware/sessionMiddleware";
import { updateVideoMood, getCombinedMoodAssessment } from "../lib/moodSystem";


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

    // Rate limiting removed - allow all session creation

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
        tools: [
          {
            type: "function",
            name: "analyze_image",
            description: "Analyze an image captured from the user's camera to describe what you can see. Use this when the user asks questions like 'can you see', 'look at this', 'what do you see', or similar vision-related requests.",
            parameters: {
              type: "object",
              properties: {
                imageData: {
                  type: "string",
                  description: "Base64 encoded image data from the camera capture"
                },
                context: {
                  type: "string",
                  description: "Context or question from the user about what they want you to analyze in the image"
                }
              },
              required: ["imageData"]
            }
          }
        ],
        instructions: `${userData.instructions}\n\nStart the conversation by asking the user how they're feeling today to assess their mood. Use the assess_user_mood tool to analyze their response and adapt your tone accordingly.\n\nYour session has a time limit of 60 minutes. If you receive an END_SESSION action from any tool call, you must immediately end the conversation politely.`,
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
      sessionTimeLimit: 10800, // Default 180 minutes (3 hours) session limit
      warningThreshold: 1800, // Warning at 30 minutes remaining
    });
  } catch (e: any) {
    console.error("Session creation error:", e);
    return res.status(500).json({
      error: "Failed to create session",
      message: e?.message || "Unknown error",
    });
  }
});

/**
 * Updates video mood data for a session
 */
router.post("/video-mood", validateApiKey, async (req, res) => {
  try {
    const { userId, sessionId, expressions, confidence } = req.body;

    if (!userId || !sessionId || !expressions || confidence === undefined) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "userId, sessionId, expressions, and confidence are required",
      });
    }

    // Update video mood in session
    updateVideoMood(userId, sessionId, expressions, confidence);

    // Get combined mood assessment
    const combinedMood = getCombinedMoodAssessment(userId, sessionId);

    res.json({
      success: true,
      message: "Video mood updated successfully",
      combinedMood,
    });
  } catch (e: any) {
    console.error("Video mood update error:", e);
    return res.status(500).json({
      error: "Failed to update video mood",
      message: e?.message || "Unknown error",
    });
  }
});

/**
 * Gets combined mood assessment for a session
 */
router.get("/mood/:userId/:sessionId", validateApiKey, async (req, res) => {
  try {
    const { userId, sessionId } = req.params;

    if (!userId || !sessionId) {
      return res.status(400).json({
        error: "Missing required parameters",
        message: "userId and sessionId are required",
      });
    }

    const combinedMood = getCombinedMoodAssessment(userId, sessionId);

    if (!combinedMood) {
      return res.status(404).json({
        error: "No mood data found",
        message: "No mood assessment available for this session",
      });
    }

    res.json({
      success: true,
      mood: combinedMood,
    });
  } catch (e: any) {
    console.error("Get mood error:", e);
    return res.status(500).json({
      error: "Failed to get mood data",
      message: e?.message || "Unknown error",
    });
  }
});

export default router;
