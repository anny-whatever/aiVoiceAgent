import { Router } from "express";
import { findRelevantTripData } from "../lib/drivingData";

const router = Router();

/** Tool endpoint invoked by the browser when model requests get_driving_data */
router.post("/tools/get_driving_data", (req, res) => {
  const { category, query } = req.body || {};
  if (!category || !query) {
    return res.status(400).json({
      error: "Category and query parameters are required",
      received: req.body,
    });
  }
  try {
    const content = findRelevantTripData(category, query);
    return res.json({ content });
  } catch (e: any) {
    console.error("Tool execution error:", e);
    return res.status(500).json({
      error: "Failed to retrieve trip data",
      details: e?.message || "Unknown error",
    });
  }
});

/** Simple self test */
router.get("/tools/test", (_req, res) => {
  try {
    const test = findRelevantTripData("work_commute", "office");
    res.json({ status: "ok", test });
  } catch (e: any) {
    res
      .status(500)
      .json({ status: "error", error: e?.message || "Unknown error" });
  }
});

export default router;
