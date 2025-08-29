import { useState } from 'react';
import { MoodAssessment } from '../types';

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
      case 'happy':
        return '😊';
      case 'content':
        return '😌';
      case 'neutral':
        return '😐';
      case 'tired':
        return '😴';
      case 'stressed':
        return '😰';
      default:
        return '😐';
    }
  };

  const getMoodColor = (mood: string | null): string => {
    const colors = {
      happy: '#4ecdc4', // Teal
      content: '#95e1d3', // Light mint green
      neutral: '#a8a8a8', // Gray
      tired: '#d3d3d3', // Light gray
      stressed: '#ff7f7f', // Light red
    };
    
    return colors[mood as keyof typeof colors] || '#a8a8a8';
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