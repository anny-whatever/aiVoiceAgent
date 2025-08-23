import { join } from "path";
import { readFileSync } from "fs";

export type Trip = {
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

export type DrivingDataFile = {
  tripData: TripData; // e.g., { work_commute: Trip[], ... }
};

let drivingData: DrivingDataFile;

export function loadDrivingData(baseDir: string) {
  const dataPath = join(baseDir, "../data/driving-data.json");
  const raw = readFileSync(dataPath, "utf-8");
  drivingData = JSON.parse(raw);
  return drivingData;
}

export function getDrivingData(): DrivingDataFile {
  if (!drivingData) throw new Error("Driving data not loaded");
  return drivingData;
}

export function findRelevantTripData(category: string, query: string) {
  const data = getDrivingData();
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
    if (key && data.tripData[key]) {
      const trips = data.tripData[key];

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
  const totals = Object.values(data.tripData).reduce(
    (s, arr) => s + arr.length,
    0
  );
  const categoryStats = Object.entries(data.tripData)
    .map(([cat, trips]) => `${cat.replace("_", " ")}: ${trips.length} trips`)
    .join(", ");

  return `Complete trip overview: ${totals} total trips across ${
    Object.keys(data.tripData).length
  } categories.\n\nBreakdown: ${categoryStats}.\n\nAsk me about specific categories for detailed trip information.`;
}
