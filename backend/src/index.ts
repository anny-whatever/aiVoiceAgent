import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Load driving data
let drivingData: any;
try {
  const dataPath = join(__dirname, "../data/driving-data.json");
  drivingData = JSON.parse(readFileSync(dataPath, "utf-8"));
  console.log("✅ Driving data loaded");
} catch (error) {
  console.error("❌ Failed to load driving data:", error);
  process.exit(1);
}

// Find relevant trip data
const findRelevantTripData = (category: string, query: string) => {
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
    if (dataKey && drivingData.tripData[dataKey]) {
      const trips = drivingData.tripData[dataKey];
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
  const totalTrips = Object.values(drivingData.tripData).reduce(
    (sum: number, category: any) => sum + category.length,
    0
  );
  const categories = Object.keys(drivingData.tripData);

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

// Session creation for WebRTC
app.post("/api/session", async (req: Request, res: Response) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Configuration error",
        message: "OpenAI API key not configured",
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-realtime-preview-2024-12-17",
          voice: "alloy",
          instructions: `You are Drival, your personal driving assistant and trip analyzer. 

You have access to all your recent driving data from the last 2 months. You can provide insights about your driving patterns, analyze your trips, remind you about frequent destinations, calculate your driving statistics, and help you understand your travel habits.

You can discuss work commutes, errands & shopping trips, social visits, entertainment & dining, weekend trips, and medical appointments. Keep responses conversational, personal, and insightful.

For general greetings, respond naturally and introduce yourself as Drival, your personal driving assistant who knows your travel patterns.`,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let userMessage = "Failed to create session";

      if (response.status === 401) {
        userMessage = "Invalid OpenAI API key or insufficient permissions";
      } else if (response.status === 403) {
        userMessage = "API key does not have Realtime API access";
      }

      return res
        .status(response.status === 401 || response.status === 403 ? 401 : 500)
        .json({
          error: `OpenAI API Error (${response.status})`,
          message: userMessage,
        });
    }

    const sessionData = await response.json();

    res.json({
      apiKey: sessionData.client_secret.value,
      sessionId: sessionData.id,
    });
  } catch (error) {
    console.error("Session creation error:", error);
    res.status(500).json({
      error: "Failed to create session",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Tool execution endpoint for trip data queries
app.post("/api/tools/get_driving_data", (req: Request, res: Response) => {
  console.log("🔧 Tool endpoint called");
  console.log("📋 Request headers:", req.headers);
  console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

  const { category, query } = req.body;

  if (!category || !query) {
    console.error("❌ Missing required parameters:", { category, query });
    return res.status(400).json({
      error: "Category and query parameters are required",
      received: req.body,
    });
  }

  try {
    console.log("📊 Looking up trip data for:", { category, query });
    const result = findRelevantTripData(category, query);
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
app.get("/api/tools/test", (req: Request, res: Response) => {
  try {
    const testResult = findRelevantTripData("work_commute", "downtown office");
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
app.get("/api/agent", (req: Request, res: Response) => {
  const totalTrips = drivingData?.tripData
    ? Object.values(drivingData.tripData).reduce(
        (sum: number, category: any) => sum + category.length,
        0
      )
    : 0;

  res.json({
    name: "Drival",
    status: "active",
    dataLoaded: !!drivingData,
    totalTrips: totalTrips,
    dataType: "personal_trip_history",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Drival server running on port ${PORT}`);
});

export default app;
