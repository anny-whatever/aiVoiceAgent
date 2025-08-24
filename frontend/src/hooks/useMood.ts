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
      // Extremely Positive
      case "ecstatic":
        return "🤩";
      case "excited":
        return "🎉";

      // Positive
      case "happy":
        return "😄";
      case "content":
        return "😊";

      // Neutral/Calm
      case "neutral":
        return "😐";
      case "calm":
        return "😌";

      // Low Energy/Negative
      case "tired":
        return "😴";
      case "sad":
        return "😢";

      // High Stress/Negative
      case "frustrated":
        return "😤";
      case "stressed":
        return "😰";
      case "angry":
        return "😠";

      default:
        return "❓";
    }
  };

  const getMoodColor = (mood: string | null): string => {
    switch (mood) {
      // Extremely Positive - Bright/Vibrant colors
      case "ecstatic":
        return "bg-gradient-to-r from-yellow-300 to-orange-400";
      case "excited":
        return "bg-gradient-to-r from-green-400 to-blue-400";

      // Positive - Green spectrum
      case "happy":
        return "bg-green-400";
      case "content":
        return "bg-green-300";

      // Neutral/Calm - Blue spectrum
      case "neutral":
        return "bg-blue-400";
      case "calm":
        return "bg-blue-300";

      // Low Energy/Negative - Purple/Gray spectrum
      case "tired":
        return "bg-purple-400";
      case "sad":
        return "bg-gray-500";

      // High Stress/Negative - Orange/Red spectrum
      case "frustrated":
        return "bg-orange-400";
      case "stressed":
        return "bg-red-300";
      case "angry":
        return "bg-red-500";

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
