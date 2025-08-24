import { Router } from "express";
import { findRelevantTripData, getUsers } from "../lib/drivingData";

const router = Router();

/** Get available users */
router.get("/users", (_req, res) => {
  try {
    const users = getUsers();
    res.json(users);
  } catch (e: any) {
    res.status(500).json({
      error: "Failed to retrieve users",
      details: e?.message || "Unknown error"
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

/** Simple self test */
router.get("/tools/test", (_req, res) => {
  try {
    const test = findRelevantTripData("user1", "work_commute", "office");
    res.json({ status: "ok", test });
  } catch (e: any) {
    res
      .status(500)
      .json({ status: "error", error: e?.message || "Unknown error" });
  }
});

export default router;
