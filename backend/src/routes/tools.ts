import { Router } from "express";
import { UserService } from '../services/userService.js';
import { VehicleService } from '../services/vehicleService.js';
import { TripService } from '../services/tripService.js';
import { mongoConnection } from '../database/mongodb';
import {
  assessUserMood,
  getSessionData,
  generateMoodInstructions,
} from "../lib/moodSystem";
import { UserMood } from "../types/mood";

import { validateApiKey, sessionCors, addSessionHeaders } from "../middleware/sessionMiddleware.js";
import { extractFirebaseUid, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// Apply middleware for session management
router.use(sessionCors);
router.use(addSessionHeaders);



// User listing endpoint removed for security - users should not be exposed

/** Tool endpoint invoked by the browser when model requests get_driving_data */
router.post("/tools/get_driving_data", 
  validateApiKey,
  extractFirebaseUid,
  async (req: AuthenticatedRequest, res) => {
    try {
      console.log("🔧 Tool called:", req.body);
      
      const { category, query, timeRange, startDate, endDate } = req.body || {};
      const userId = req.firebase_uid; // Get from middleware
      
      if (!userId) {
        return res.status(401).json({
          error: "Firebase UID is required",
          message: "User authentication failed"
        });
      }
      
      if (!category || !query) {
        console.error("❌ Missing required parameters:", {
          category,
          query,
          body: req.body,
        });
        return res.status(400).json({
          error: "Category and query parameters are required",
          received: req.body,
        });
      }

      // For now, return a simple response since the full implementation was removed
      return res.json({
        success: true,
        content: "Driving data functionality is being updated. Please try again later.",
        data: [],
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
        error: "Failed to retrieve driving data",
        details: e?.message || "Unknown error",
      });
    }
  }
);

/** User info tool endpoint - called by AI agent to get user streak and driving stats */
router.post("/tools/get_user_info", 
  validateApiKey,
  extractFirebaseUid,
  async (req: AuthenticatedRequest, res) => {
    try {
      console.log("👤 User info tool called:", req.body);
      
      const { query } = req.body || {};
      const userId = req.firebase_uid; // Get from middleware
      
      if (!userId) {
        return res.status(401).json({
          error: "Firebase UID is required",
          message: "User authentication failed"
        });
      }
      
      if (!query) {
        console.error("❌ Missing required parameters:", {
          query,
          body: req.body,
        });
        return res.status(400).json({
          error: "Query parameter is required",
          received: req.body,
        });
      }

      // Ensure MongoDB connection
      await mongoConnection.ensureConnection();
      
      // Get user data
      const user = await UserService.getUserByFirebaseUid(userId);
      
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          userId
        });
      }

      // Extract relevant user information
      const userInfo = {
        streak_data: {
          current_daily_streak: user.streak_data?.current_daily_streak || 0,
          longest_daily_streak: user.streak_data?.longest_daily_streak || 0,
          last_activity_date: user.streak_data?.last_activity_date || null
        },
        driving_stats: {
          total_distance_km: user.driving_stats?.total_distance_km || 0,
          total_trips: user.driving_stats?.total_trips || 0,
          eco_score_average: user.driving_stats?.eco_score_average || 0,
          safety_violations: user.driving_stats?.safety_violations || 0,
          night_drives: user.driving_stats?.night_drives || 0,
          weekend_drives: user.driving_stats?.weekend_drives || 0
        },
        profile_completion: {
          completion_percentage: user.profile_completion?.completion_percentage || 0,
          basic_info: user.profile_completion?.basic_info || false,
          contact_verified: user.profile_completion?.contact_verified || false,
          car_info: user.profile_completion?.car_info || false,
          license_verified: user.profile_completion?.license_verified || false
        },
        achievements: {
          welcome_bonus: user.achievements?.welcome_bonus || false,
          first_drive: user.achievements?.first_drive || false,
          first_review: user.achievements?.first_review || false
        }
      };

      // Format response based on query
      let content = "";
      const queryLower = query.toLowerCase();
      
      if (queryLower.includes('streak')) {
        content = `Your current daily streak is ${userInfo.streak_data.current_daily_streak} days. Your longest streak was ${userInfo.streak_data.longest_daily_streak} days.`;
        if (userInfo.streak_data.last_activity_date) {
          content += ` Last activity: ${new Date(userInfo.streak_data.last_activity_date).toLocaleDateString()}.`;
        }
      } else if (queryLower.includes('driving') || queryLower.includes('stats')) {
        content = `Your driving statistics: ${userInfo.driving_stats.total_trips} total trips covering ${userInfo.driving_stats.total_distance_km.toFixed(1)} km. Average eco-score: ${userInfo.driving_stats.eco_score_average}. Safety violations: ${userInfo.driving_stats.safety_violations}. Night drives: ${userInfo.driving_stats.night_drives}, Weekend drives: ${userInfo.driving_stats.weekend_drives}.`;
      } else {
        // General user info
        content = `User Profile Summary:\n- Current streak: ${userInfo.streak_data.current_daily_streak} days\n- Total trips: ${userInfo.driving_stats.total_trips}\n- Total distance: ${userInfo.driving_stats.total_distance_km.toFixed(1)} km\n- Average eco-score: ${userInfo.driving_stats.eco_score_average}\n- Profile completion: ${userInfo.profile_completion.completion_percentage}%`;
      }
      
      console.log(
        "✅ User info returned for query:",
        query,
        "| Content length:",
        content.length
      );
      
      return res.json({ 
        success: true,
        content,
        data: userInfo,
        metadata: {
          userId,
          query,
          timestamp: new Date().toISOString()
        }
      });
    } catch (e: any) {
      console.error("❌ User info tool execution error:", e);
      return res.status(500).json({
        error: "Failed to retrieve user information",
        details: e?.message || "Unknown error",
      });
    }
  }
);

/** Vehicle info tool endpoint - called by AI agent to get vehicle information */
router.post("/tools/get_vehicle_info", 
  validateApiKey,
  extractFirebaseUid,
  async (req: AuthenticatedRequest, res) => {
    try {
      console.log("🚗 Vehicle info tool called:", req.body);
      
      const { query } = req.body || {};
      const userId = req.firebase_uid; // Get from middleware
      
      if (!userId) {
        return res.status(401).json({
          error: "Firebase UID is required",
          message: "User authentication failed"
        });
      }
      
      if (!query) {
        console.error("❌ Missing required parameters:", {
          query,
          body: req.body,
        });
        return res.status(400).json({
          error: "Query parameter is required",
          received: req.body,
        });
      }

      // Ensure MongoDB connection
      await mongoConnection.ensureConnection();
      
      // Get all vehicles for the user
      const vehicles = await VehicleService.getVehiclesByUserId(userId);
      
      if (!vehicles || vehicles.length === 0) {
        return res.json({
          success: true,
          content: "No vehicles found for this user.",
          data: [],
          metadata: {
            userId,
            query,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Format vehicle information
      const vehicleData = vehicles.map(vehicle => ({
        id: vehicle._id,
        name: vehicle.vehicle_name,
        make: vehicle.make,
        model: vehicle.vehicle_model,
        year: vehicle.year,
        variant: vehicle.variant,
        color: vehicle.color,
        fuel_type: vehicle.fuel_type,
        transmission: vehicle.transmission,
        registration_number: vehicle.registration_number,
        odometer_reading: vehicle.odometer_reading,
        condition_rating: vehicle.condition_rating,
        known_issues: vehicle.known_issues,
        ownership_type: vehicle.ownership_type,
        is_primary_vehicle: vehicle.is_primary_vehicle,
        is_active: vehicle.is_active,
        usual_location: vehicle.usual_location,
        average_monthly_km: vehicle.average_monthly_km,
        usage_type: vehicle.usage_type,
        insurance_details: vehicle.insurance_details
      }));

      // Generate content based on query
      let content = "";
      const queryLower = query.toLowerCase();
      
      if (queryLower.includes('primary') || queryLower.includes('main')) {
        const primaryVehicle = vehicleData.find(v => v.is_primary_vehicle);
        if (primaryVehicle) {
          content = `Your primary vehicle is a ${primaryVehicle.year} ${primaryVehicle.make} ${primaryVehicle.model}${primaryVehicle.variant ? ` ${primaryVehicle.variant}` : ''} in ${primaryVehicle.color} color. Registration: ${primaryVehicle.registration_number}. Current odometer: ${primaryVehicle.odometer_reading} km.`;
        } else {
          content = "No primary vehicle set.";
        }
      } else if (queryLower.includes('insurance')) {
        const vehiclesWithInsurance = vehicleData.filter(v => v.insurance_details);
        if (vehiclesWithInsurance.length > 0) {
          content = vehiclesWithInsurance.map(v => 
            `${v.name}: ${v.insurance_details!.provider} policy ${v.insurance_details!.policy_number}, expires ${new Date(v.insurance_details!.expiry_date).toLocaleDateString()}`
          ).join('. ');
        } else {
          content = "No insurance information available for your vehicles.";
        }
      } else if (queryLower.includes('condition') || queryLower.includes('issues')) {
        content = vehicleData.map(v => {
          let vehicleInfo = `${v.name}: Condition rating ${v.condition_rating || 'N/A'}/10`;
          if (v.known_issues && v.known_issues.length > 0) {
            vehicleInfo += `, Known issues: ${v.known_issues.join(', ')}`;
          }
          return vehicleInfo;
        }).join('. ');
      } else {
        // General vehicle overview
        content = `You have ${vehicleData.length} vehicle${vehicleData.length > 1 ? 's' : ''}: ` + 
          vehicleData.map(v => 
            `${v.year} ${v.make} ${v.model}${v.variant ? ` ${v.variant}` : ''} (${v.name})${v.is_primary_vehicle ? ' - Primary' : ''}`
          ).join(', ') + '.';
      }
      
      console.log(
        "✅ Vehicle info returned for query:",
        query,
        "| Vehicles found:",
        vehicleData.length
      );
      
      return res.json({ 
        success: true,
        content,
        data: vehicleData,
        metadata: {
          userId,
          query,
          vehicleCount: vehicleData.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (e: any) {
      console.error("❌ Vehicle info tool execution error:", e);
      return res.status(500).json({
        error: "Failed to retrieve vehicle information",
        details: e?.message || "Unknown error",
      });
    }
  }
);

/** Mood assessment tool endpoint - called by AI agent to assess user mood */
router.post("/tools/assess_user_mood", 
  validateApiKey,
  extractFirebaseUid,
  async (req: AuthenticatedRequest, res) => {
  console.log("🧠 Mood assessment tool called:", req.body);

  const { userResponse, sessionId } = req.body || {};
  const userId = req.firebase_uid; // Get from middleware
  
  if (!userId) {
    return res.status(401).json({
      error: "Firebase UID is required",
      message: "User authentication failed"
    });
  }
  
  if (!userResponse || !sessionId) {
    console.error("❌ Missing required parameters for mood assessment:", {
      userResponse: userResponse ? "provided" : "missing",
      sessionId,
      body: req.body,
    });
    return res.status(400).json({
      error: "UserResponse and sessionId parameters are required",
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
