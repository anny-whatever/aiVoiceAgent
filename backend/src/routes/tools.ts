import { Router } from "express";
import { findRelevantTripData } from "../lib/drivingData";
import { DrivingDataService } from '../services/drivingDataService';
import { mongoConnection } from '../database/mongodb';
import {
  assessUserMood,
  getSessionData,
  generateMoodInstructions,
} from "../lib/moodSystem";
import { UserMood } from "../types/mood";

import { validateApiKey, sessionCors, addSessionHeaders } from "../middleware/sessionMiddleware.js";

const router = Router();

// Apply middleware for session management
router.use(sessionCors);
router.use(addSessionHeaders);



// User listing endpoint removed for security - users should not be exposed

/** Tool endpoint invoked by the browser when model requests get_driving_data */
router.post("/tools/get_driving_data", 
  validateApiKey,
  async (req, res) => {
    try {
      console.log("🔧 Tool called:", req.body);
      
      const { userId, category, query, timeRange, startDate, endDate } = req.body || {};
      
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
          validCategories: [
            'work_commute', 'errands_shopping', 'social_visits', 
            'leisure_recreation', 'medical_appointments', 'other', 'general'
          ]
        });
      }

      // Ensure MongoDB connection
       await mongoConnection.ensureConnection();
       
       // Use enhanced service with MongoDB support
       const result = await DrivingDataService.findRelevantTripData(
         userId, 
         category, 
         query
       );
      
      console.log(
        "✅ Complete data returned for category:",
        category,
        "| First 100 chars:",
        result.substring(0, 100) + "..."
      );
      
      return res.json({ 
        success: true,
        content: result,
        metadata: {
          userId,
          category,
          query,
          timestamp: new Date().toISOString()
        }
      });
    } catch (e: any) {
      console.error("❌ Tool execution error:", e);
      return res.status(500).json({
        error: "Failed to retrieve trip data",
        details: e?.message || "Unknown error",
      });
    }
  }
);

/** Mood assessment tool endpoint - called by AI agent */
router.post("/tools/assess_user_mood", validateApiKey, async (req, res) => {
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
router.get("/session/:userId/:sessionId/mood", validateApiKey, (req, res) => {
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



export default router;
