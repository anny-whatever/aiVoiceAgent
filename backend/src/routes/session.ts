import { Router } from "express";
import fetch from "node-fetch";
import { ENV } from "../config/env";

const router = Router();

/**
 * Creates an ephemeral Realtime session secret for the browser.
 * NOTE: We *never* send OPENAI_API_KEY to the browser.
 */
router.post("/session", async (_req, res) => {
  try {
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
        // keep server-side instructions short; we'll send fuller config via session.update from client
        instructions:
          "You are Drival, a helpful driving assistant and trip analyst. Be concise and conversational.",
        tool_choice: "auto",
        tools: [
          {
            type: "function",
            name: "get_driving_data",
            description: "Get personal trip data and insights",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: [
                    "work_commute",
                    "errands_shopping",
                    "social_visits",
                    "entertainment_dining",
                    "weekend_trips",
                    "medical_appointments",
                    "general",
                  ],
                },
                query: { type: "string" },
              },
              required: ["category", "query"],
            },
          },
        ],
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
