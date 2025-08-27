import { join } from "path";
import { readFileSync, writeFileSync } from "fs";

export type Trip = {
  id: string;
  date: string;
  time?: string;
  start_location: string;
  end_location: string;
  distance?: string;
  duration?: string;
  notes?: string;
  purpose?: string;
};

export type TripData = Record<string, Trip[]>;

export type UserData = {
  name: string;
  systemPrompt: string;
  instructions: string;
  tripData: TripData;
};

export type MultiUserDrivingDataFile = {
  users: Record<string, UserData>;
};

let multiUserDrivingData: MultiUserDrivingDataFile;

export function loadDrivingData(baseDir: string) {
  const dataPath = join(baseDir, "../data/multi-user-driving-data.json");
  const raw = readFileSync(dataPath, "utf-8");
  multiUserDrivingData = JSON.parse(raw);
  return multiUserDrivingData;
}

export function getMultiUserDrivingData(): MultiUserDrivingDataFile {
  if (!multiUserDrivingData) throw new Error("Multi-user driving data not loaded");
  return multiUserDrivingData;
}

export function getUsers(): Array<{id: string, name: string}> {
  const data = getMultiUserDrivingData();
  return Object.keys(data.users).map(userId => ({
    id: userId,
    name: data.users[userId].name
  }));
}

export function createUser(userId: string): UserData {
  const userData: UserData = {
    name: `User ${userId}`,
    systemPrompt: `You are Drival, ${userId}'s personal driving assistant and trip analyzer. You have access to all of ${userId}'s driving data. You can provide insights about their driving patterns, analyze their trips, remind them about frequent destinations, calculate their driving statistics, and help them understand their travel habits. You're helpful, personal, and can remember details about their trips.`,
    instructions: `When ${userId} asks about their trips, driving patterns, or travel history, search through their personal trip data to provide accurate insights and analysis. You can discuss specific trips, calculate totals, identify patterns, and provide personalized recommendations based on their actual driving behavior.`,
    tripData: {
      work_commute: [],
      errands_shopping: [],
      social_visits: [],
      entertainment_dining: [],
      weekend_trips: [],
      medical_appointments: [],
      general: []
    }
  };
  
  // Add user to in-memory data
  const data = getMultiUserDrivingData();
  data.users[userId] = userData;
  
  // Persist to file
  try {
    const dataPath = join(process.cwd(), "data/multi-user-driving-data.json");
    writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`✅ Created new user: ${userId}`);
  } catch (error) {
    console.error(`❌ Failed to persist user ${userId}:`, error);
  }
  
  return userData;
}

export function getUserData(userId: string): UserData {
  const data = getMultiUserDrivingData();
  if (!data.users[userId]) {
    console.log(`🔄 Creating new user: ${userId}`);
    return createUser(userId);
  }
  return data.users[userId];
}

export function findRelevantTripData(userId: string, category: string, query: string) {
  const userData = getUserData(userId);
  const categoryMap: Record<string, string> = {
    work_commute: "work_commute",
    errands_shopping: "errands_shopping",
    social_visits: "social_visits",
    entertainment_dining: "entertainment_dining",
    weekend_trips: "weekend_trips",
    medical_appointments: "medical_appointments",
    general: "general",
  };

  if (category && category !== "general") {
    const key = categoryMap[category];
    if (key && userData.tripData[key]) {
      const trips = userData.tripData[key];

      // Sort trips by date (newest first) to ensure proper chronological order
      const sortedTrips = [...trips].sort((a, b) => {
        const dateA = new Date(a.date + (a.time ? ` ${a.time}` : ""));
        const dateB = new Date(b.date + (b.time ? ` ${b.time}` : ""));
        return dateB.getTime() - dateA.getTime();
      });

      // Return ALL trips for the category to give AI complete context
      const formattedTrips = sortedTrips.map((t) => {
        const timeStr = t.time ? ` ${t.time}` : "";
        const distanceDuration =
          t.distance || t.duration
            ? ` (${[t.distance, t.duration].filter(Boolean).join(", ")})`
            : "";
        const details =
          t.notes || t.purpose ? ` — ${t.notes || t.purpose}` : "";

        return `${t.date}${timeStr}: ${t.start_location} → ${t.end_location}${distanceDuration}${details}`;
      });

      const categoryName = category.replace("_", " ");
      return `Complete ${categoryName} data (${
        sortedTrips.length
      } trips, sorted newest first):\n\n${formattedTrips.join("\n\n")}`;
    }
    return "No trips found for that category.";
  }

  // For general queries, provide overview
  const totals = Object.values(userData.tripData).reduce(
    (s, arr) => s + arr.length,
    0
  );
  const categoryStats = Object.entries(userData.tripData)
    .map(([cat, trips]) => `${cat.replace("_", " ")}: ${trips.length} trips`)
    .join(", ");

  return `Complete trip overview: ${totals} total trips across ${
    Object.keys(userData.tripData).length
  } categories.\n\nBreakdown: ${categoryStats}.\n\nAsk me about specific categories for detailed trip information.`;
}
