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
router.post("/tools/assess_user_mood", async (req, res) => {
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
    const moodAssessment = await assessUserMood(
      userId,
      userResponse,
      sessionId
    );
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

/** Enhanced mood system test with full spectrum */
router.get("/tools/test", async (_req, res) => {
  try {
    const test = findRelevantTripData("user1", "work_commute", "office");

    // Test the full 11-mood spectrum with tone analysis
    const moodTests = {
      ecstatic: await assessUserMood(
        "user1",
        "OMG this is AMAZING!! I'm so thrilled!!",
        "test-1"
      ),
      excited: await assessUserMood(
        "user1",
        "I'm pumped for this drive!",
        "test-2"
      ),
      happy: await assessUserMood(
        "user1",
        "I'm feeling wonderful today!",
        "test-3"
      ),
      content: await assessUserMood(
        "user1",
        "I'm good, tell me about my trips",
        "test-4"
      ),
      neutral: await assessUserMood(
        "user1",
        "Just need directions to downtown",
        "test-5"
      ),
      calm: await assessUserMood(
        "user1",
        "I'm feeling peaceful and relaxed",
        "test-6"
      ),
      tired: await assessUserMood(
        "user1",
        "Ugh I'm so exhausted from work",
        "test-7"
      ),
      sad: await assessUserMood(
        "user1",
        "I'm feeling pretty down today",
        "test-8"
      ),
      frustrated: await assessUserMood(
        "user1",
        "This traffic is so annoying",
        "test-9"
      ),
      stressed: await assessUserMood(
        "user1",
        "I'm really anxious about being late",
        "test-10"
      ),
      angry: await assessUserMood(
        "user1",
        "I'm furious about this situation!",
        "test-11"
      ),

      // Test subtle tone detection
      subtle_frustrated: await assessUserMood(
        "user1",
        "Whatever, just tell me the route",
        "test-12"
      ),
      subtle_tired: await assessUserMood(
        "user1",
        "Sure... I guess that works",
        "test-13"
      ),
      mood_change: await assessUserMood(
        "user1",
        "Actually this is getting really frustrating",
        "test-14",
        UserMood.CONTENT
      ),
    };

    res.json({
      status: "ok",
      tripDataTest: test.substring(0, 100) + "...",
      moodSystemVersion: "2.0 - Full Spectrum with Tone Analysis",
      totalMoods: 11,
      moodTests,
    });
  } catch (e: any) {
    res
      .status(500)
      .json({ status: "error", error: e?.message || "Unknown error" });
  }
});

export default router;
