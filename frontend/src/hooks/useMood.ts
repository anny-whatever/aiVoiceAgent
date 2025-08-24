import { useState } from "react";
import { MoodAssessment } from "../types";

export const useMood = () => {
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [moodConfidence, setMoodConfidence] = useState(0);

  const updateMood = (assessment: MoodAssessment | null) => {
    if (assessment) {
      setCurrentMood(assessment.mood);
      setMoodConfidence(assessment.confidence);
    } else {
      setCurrentMood(null);
      setMoodConfidence(0);
    }
  };

  const clearMood = () => {
    setCurrentMood(null);
    setMoodConfidence(0);
  };

  const getMoodEmoji = (mood: string | null): string => {
    switch (mood) {
      case "energetic":
        return "⚡";
      case "content":
        return "😊";
      case "neutral":
        return "😐";
      case "tired":
        return "😴";
      case "stressed":
        return "😰";
      default:
        return "❓";
    }
  };

  const getMoodColor = (mood: string | null): string => {
    switch (mood) {
      case "energetic":
        return "bg-yellow-400";
      case "content":
        return "bg-green-400";
      case "neutral":
        return "bg-blue-400";
      case "tired":
        return "bg-purple-400";
      case "stressed":
        return "bg-red-400";
      default:
        return "bg-gray-400";
    }
  };

  return {
    currentMood,
    moodConfidence,
    setCurrentMood,
    setMoodConfidence,
    updateMood,
    clearMood,
    getMoodEmoji,
    getMoodColor,
  };
};
