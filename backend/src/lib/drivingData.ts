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
      const q = query.toLowerCase();
      const matches = trips.filter((t) =>
        [
          t.purpose,
          t.start_location,
          t.end_location,
          t.notes,
          t.date,
          t.time,
          t.distance,
          t.duration,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );

      if (matches.length) {
        const out = matches
          .slice(0, 3)
          .map(
            (t) =>
              `${t.date}${t.time ? " " + t.time : ""}: ${t.start_location} → ${
                t.end_location
              }` +
              `${t.distance ? ` (${t.distance}` : ""}${
                t.duration
                  ? `${t.distance ? ", " : " ("}${t.duration})`
                  : t.distance
                  ? ")"
                  : ""
              }` +
              `${
                t.notes ? ` — ${t.notes}` : t.purpose ? ` — ${t.purpose}` : ""
              }`
          );
        return `Here are your ${category.replace(
          "_",
          " "
        )} trips:\n\n${out.join("\n\n")}`;
      } else {
        const out = trips
          .slice(0, 3)
          .map(
            (t) =>
              `${t.date}: ${t.start_location} → ${t.end_location}` +
              `${t.distance ? ` (${t.distance}` : ""}${
                t.duration
                  ? `${t.distance ? ", " : " ("}${t.duration})`
                  : t.distance
                  ? ")"
                  : ""
              }`
          );
        return `Your recent ${category.replace("_", " ")} trips:\n\n${out.join(
          "\n"
        )}`;
      }
    }
    return "No trips found for that category.";
  }

  const totals = Object.values(data.tripData).reduce(
    (s, arr) => s + arr.length,
    0
  );
  const cats = Object.keys(data.tripData)
    .map((c) => c.replace("_", " "))
    .join(", ");
  return `I have data for ${totals} trips across ${
    Object.keys(data.tripData).length
  } categories: ${cats}. Ask me about trip types, destinations, dates, or patterns.`;
}
