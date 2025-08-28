import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import { validateApiKey } from "./middleware/sessionMiddleware.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    // origin: process.env.FRONTEND_URL || "http://localhost:5173",
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());

// Load multi-user driving data
let multiUserDrivingData: any;
try {
  const dataPath = join(__dirname, "../data/multi-user-driving-data.json");
  multiUserDrivingData = JSON.parse(readFileSync(dataPath, "utf-8"));
  console.log("✅ Multi-user driving data loaded");
} catch (error) {
  console.error("❌ Failed to load multi-user driving data:", error);
  process.exit(1);
}

// Find relevant trip data for a specific user
const findRelevantTripData = (
  userId: string,
  category: string,
  query: string
) => {
  // Validate user exists
  if (!multiUserDrivingData.users[userId]) {
    throw new Error(`User ${userId} not found`);
  }

  const userData = multiUserDrivingData.users[userId];

  const categoryMap: { [key: string]: string } = {
    work_commute: "work_commute",
    errands_shopping: "errands_shopping",
    social_visits: "social_visits",
    entertainment_dining: "entertainment_dining",
    weekend_trips: "weekend_trips",
    medical_appointments: "medical_appointments",
    general: "general",
  };

  if (category && category !== "general") {
    const dataKey = categoryMap[category];
    if (dataKey && userData.tripData[dataKey]) {
      const trips = userData.tripData[dataKey];
      const queryLower = query.toLowerCase();

      // Search through trips for relevant matches
      const relevantTrips = trips.filter(
        (trip: any) =>
          trip.purpose.toLowerCase().includes(queryLower) ||
          trip.start_location.toLowerCase().includes(queryLower) ||
          trip.end_location.toLowerCase().includes(queryLower) ||
          trip.notes.toLowerCase().includes(queryLower) ||
          trip.date.includes(queryLower)
      );

      if (relevantTrips.length > 0) {
        // Return formatted trip information
        const tripSummaries = relevantTrips
          .slice(0, 3)
          .map(
            (trip: any) =>
              `${trip.date} at ${trip.time}: ${trip.start_location} to ${
                trip.end_location
              } (${trip.distance}, ${trip.duration}) - ${
                trip.notes || trip.purpose
              }`
          )
          .join("\n\n");

        return `Here are your ${category.replace(
          "_",
          " "
        )} trips:\n\n${tripSummaries}`;
      } else {
        // Return general category information
        const allTrips = trips
          .slice(0, 3)
          .map(
            (trip: any) =>
              `${trip.date}: ${trip.start_location} to ${trip.end_location} (${trip.distance}, ${trip.duration})`
          )
          .join("\n");

        return `Your recent ${category.replace(
          "_",
          " "
        )} trips:\n\n${allTrips}`;
      }
    }
    return "No trips found for that category.";
  }

  // General overview
  const totalTrips = Object.values(userData.tripData).reduce(
    (sum: number, category: any) => sum + category.length,
    0
  );
  const categories = Object.keys(userData.tripData);

  return `I have data for ${totalTrips} trips across ${
    categories.length
  } categories: ${categories
    .map((cat) => cat.replace("_", " "))
    .join(
      ", "
    )}. You can ask about specific trip types, destinations, dates, or general driving patterns.`;
};

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// User listing endpoint removed for security - users should not be exposed

// Session creation is now handled by the session router with proper usage tracking

// Tool execution endpoint for trip data queries
app.post("/api/tools/get_driving_data", validateApiKey, (req: Request, res: Response) => {
  console.log("🔧 Tool endpoint called");
  console.log("📋 Request headers:", req.headers);
  console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

  const { userId, category, query } = req.body;

  if (!userId || !category || !query) {
    console.error("❌ Missing required parameters:", {
      userId,
      category,
      query,
    });
    return res.status(400).json({
      error: "UserId, category and query parameters are required",
      received: req.body,
    });
  }

  try {
    console.log("📊 Looking up trip data for:", { userId, category, query });
    const result = findRelevantTripData(userId, category, query);
    console.log("✅ Found result length:", result.length, "characters");
    console.log("✅ Result preview:", result.substring(0, 100) + "...");

    const response = { content: result };
    console.log("📤 Sending response:", JSON.stringify(response, null, 2));

    res.json(response);
  } catch (error) {
    console.error("❌ Tool execution error:", error);
    res.status(500).json({
      error: "Failed to retrieve trip data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Add a test endpoint to verify the tool function works
app.get("/api/tools/test", validateApiKey, (req: Request, res: Response) => {
  try {
    // Use the first available user for testing
    const firstUserId = Object.keys(multiUserDrivingData.users)[0];
    const testResult = findRelevantTripData(
      firstUserId,
      "work_commute",
      "downtown office"
    );
    res.json({
      status: "success",
      testResult: testResult,
      message: "Trip data function is working correctly",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Agent status
app.get("/api/agent", validateApiKey, (req: Request, res: Response) => {
  const totalTrips = multiUserDrivingData?.users
    ? Object.values(multiUserDrivingData.users).reduce(
        (sum: number, user: any) => {
          return (
            sum +
            Object.values(user.tripData).reduce(
              (userSum: number, category: any) => userSum + category.length,
              0
            )
          );
        },
        0
      )
    : 0;

  const totalUsers = multiUserDrivingData?.users
    ? Object.keys(multiUserDrivingData.users).length
    : 0;

  res.json({
    name: "Drival",
    status: "active",
    dataLoaded: !!multiUserDrivingData,
    totalTrips: totalTrips,
    totalUsers: totalUsers,
    dataType: "multi_user_trip_history",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Drival server running on port ${PORT}`);
});

export default app;
