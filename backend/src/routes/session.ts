import { Router } from "express";
import fetch from "node-fetch";
import { ENV } from "../config/env";
import { getUserData } from "../lib/drivingData";

const router = Router();

/**
 * Creates an ephemeral Realtime session secret for the browser.
 * NOTE: We *never* send OPENAI_API_KEY to the browser.
 */
router.post("/session", async (req, res) => {
  try {
    const { userId } = req.body;

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
        // Keep minimal config here - tools will be added via session.update
        instructions: `${userData.instructions}\n\nIMPORTANT: Start the conversation by asking the user how they're feeling today to assess their mood. Use the assess_user_mood tool to analyze their response and adapt your tone accordingly.`,
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
    return res.json({
      apiKey: payload.client_secret.value,
      sessionId: payload.id,
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
