import { Router } from "express";
import { findRelevantTripData, getUsers } from "../lib/drivingData";
import {
  assessUserMood,
  getSessionData,
  generateMoodInstructions,
} from "../lib/moodSystem";
import { UserMood } from "../types/mood";

const router = Router();

/** Get available users */
router.get("/users", (_req, res) => {
  try {
    const users = getUsers();
    res.json(users);
  } catch (e: any) {
    res.status(500).json({
      error: "Failed to retrieve users",
      details: e?.message || "Unknown error",
    });
  }
});

/** Tool endpoint invoked by the browser when model requests get_driving_data */
router.post("/tools/get_driving_data", (req, res) => {
  console.log("🔧 Tool called:", req.body);

  const { userId, category, query } = req.body || {};
  if (!userId || !category || !query) {
    console.error("❌ Missing required parameters:", {
      userId,
      category,
      query,
      body: req.body,
    });
    return res.status(400).json({
      error: "UserId, category and query parameters are required",
      received: req.body,
    });
  }

  try {
    const content = findRelevantTripData(userId, category, query);
    console.log(
      "✅ Complete data returned for category:",
      category,
      "| First 100 chars:",
      content.substring(0, 100) + "..."
    );
    return res.json({ content });
  } catch (e: any) {
    console.error("❌ Tool execution error:", e);
    return res.status(500).json({
      error: "Failed to retrieve trip data",
      details: e?.message || "Unknown error",
    });
  }
});

/** Mood assessment tool endpoint - called by AI agent */
router.post("/tools/assess_user_mood", (req, res) => {
  console.log("🧠 Mood assessment tool called:", req.body);

  const { userId, userResponse, sessionId } = req.body || {};
  if (!userId || !userResponse || !sessionId) {
    console.error("❌ Missing required parameters for mood assessment:", {
      userId,
      userResponse: userResponse ? "provided" : "missing",
      sessionId,
      body: req.body,
    });
    return res.status(400).json({
      error: "UserId, userResponse, and sessionId parameters are required",
      received: req.body,
    });
  }

  try {
    const moodAssessment = assessUserMood(userId, userResponse, sessionId);
    const moodInstructions = generateMoodInstructions(moodAssessment.mood);

    console.log(
      "✅ Mood assessed:",
      moodAssessment.mood,
      "| Confidence:",
      moodAssessment.confidence.toFixed(2)
    );

    return res.json({
      assessment: moodAssessment,
      instructions: moodInstructions,
      content: `Mood detected: ${moodAssessment.mood} (${Math.round(
        moodAssessment.confidence * 100
      )}% confidence). ${
        moodAssessment.reasoning
      }. I'll adjust my tone accordingly throughout our conversation.`,
    });
  } catch (e: any) {
    console.error("❌ Mood assessment error:", e);
    return res.status(500).json({
      error: "Failed to assess mood",
      details: e?.message || "Unknown error",
    });
  }
});

/** Get current session mood data */
router.get("/session/:userId/:sessionId/mood", (req, res) => {
  const { userId, sessionId } = req.params;

  try {
    const sessionData = getSessionData(userId, sessionId);
    if (!sessionData || !sessionData.currentMood) {
      return res.status(404).json({
        error: "No mood data found for this session",
      });
    }

    return res.json({
      mood: sessionData.currentMood,
      conversationContext: sessionData.conversationContext,
    });
  } catch (e: any) {
    console.error("❌ Session mood retrieval error:", e);
    return res.status(500).json({
      error: "Failed to retrieve session mood",
      details: e?.message || "Unknown error",
    });
  }
});

/** Simple self test */
router.get("/tools/test", (_req, res) => {
  try {
    const test = findRelevantTripData("user1", "work_commute", "office");
    const moodTest = assessUserMood(
      "user1",
      "I'm feeling great today!",
      "test-session"
    );
    res.json({
      status: "ok",
      tripDataTest: test.substring(0, 100) + "...",
      moodTest: moodTest,
    });
  } catch (e: any) {
    res
      .status(500)
      .json({ status: "error", error: e?.message || "Unknown error" });
  }
});

export default router;
