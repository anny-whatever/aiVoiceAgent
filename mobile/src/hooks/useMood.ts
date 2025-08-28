import { useState, useCallback } from 'react';
import { MoodAssessment } from '../types';

type MoodType = "energetic" | "content" | "neutral" | "tired" | "stressed";

const MOOD_COLORS: Record<MoodType, string> = {
  energetic: '#10b981', // green
  content: '#3b82f6',   // blue
  neutral: '#6b7280',   // gray
  tired: '#f59e0b',     // amber
  stressed: '#ef4444',  // red
};

const MOOD_EMOJIS: Record<MoodType, string> = {
  energetic: '⚡',
  content: '😊',
  neutral: '😐',
  tired: '😴',
  stressed: '😰',
};

const MOOD_LABELS: Record<MoodType, string> = {
  energetic: 'Energetic',
  content: 'Content',
  neutral: 'Neutral',
  tired: 'Tired',
  stressed: 'Stressed',
};

export const useMood = () => {
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [moodConfidence, setMoodConfidence] = useState<number>(0);
  const [moodHistory, setMoodHistory] = useState<Array<MoodAssessment & { timestamp: number }>>([]);
  const [isAssessing, setIsAssessing] = useState(false);

  const updateMood = useCallback((mood: string | null, confidence: number = 0) => {
    setCurrentMood(mood);
    setMoodConfidence(confidence);
    
    // Add to history if it's a valid mood
    if (mood && Object.keys(MOOD_COLORS).includes(mood as MoodType)) {
      const moodAssessment: MoodAssessment & { timestamp: number } = {
        mood: mood as MoodType,
        confidence,
        timestamp: Date.now(),
      };
      
      setMoodHistory(prev => {
        const newHistory = [moodAssessment, ...prev];
        // Keep only last 50 assessments
        return newHistory.slice(0, 50);
      });
    }
  }, []);

  const getMoodColor = useCallback((mood?: string | null) => {
    const moodToCheck = mood || currentMood;
    if (!moodToCheck || !Object.keys(MOOD_COLORS).includes(moodToCheck as MoodType)) {
      return MOOD_COLORS.neutral;
    }
    return MOOD_COLORS[moodToCheck as MoodType];
  }, [currentMood]);

  const getMoodEmoji = useCallback((mood?: string | null) => {
    const moodToCheck = mood || currentMood;
    if (!moodToCheck || !Object.keys(MOOD_EMOJIS).includes(moodToCheck as MoodType)) {
      return MOOD_EMOJIS.neutral;
    }
    return MOOD_EMOJIS[moodToCheck as MoodType];
  }, [currentMood]);

  const getMoodLabel = useCallback((mood?: string | null) => {
    const moodToCheck = mood || currentMood;
    if (!moodToCheck || !Object.keys(MOOD_LABELS).includes(moodToCheck as MoodType)) {
      return MOOD_LABELS.neutral;
    }
    return MOOD_LABELS[moodToCheck as MoodType];
  }, [currentMood]);

  const getConfidenceLevel = useCallback((confidence?: number) => {
    const conf = confidence !== undefined ? confidence : moodConfidence;
    if (conf >= 0.8) return 'High';
    if (conf >= 0.6) return 'Medium';
    if (conf >= 0.4) return 'Low';
    return 'Very Low';
  }, [moodConfidence]);

  const getConfidenceColor = useCallback((confidence?: number) => {
    const conf = confidence !== undefined ? confidence : moodConfidence;
    if (conf >= 0.8) return '#10b981'; // green
    if (conf >= 0.6) return '#3b82f6'; // blue
    if (conf >= 0.4) return '#f59e0b'; // amber
    return '#ef4444'; // red
  }, [moodConfidence]);

  const clearMood = useCallback(() => {
    setCurrentMood(null);
    setMoodConfidence(0);
  }, []);

  const clearHistory = useCallback(() => {
    setMoodHistory([]);
  }, []);

  const getRecentMoods = useCallback((count: number = 10) => {
    return moodHistory.slice(0, count);
  }, [moodHistory]);

  const getMoodTrend = useCallback(() => {
    if (moodHistory.length < 2) return 'stable';
    
    const recent = moodHistory.slice(0, 3);
    const moodValues = {
      stressed: 1,
      tired: 2,
      neutral: 3,
      content: 4,
      energetic: 5,
    };
    
    const values = recent.map(m => moodValues[m.mood]);
    const trend = values[0] - values[values.length - 1];
    
    if (trend > 0) return 'improving';
    if (trend < 0) return 'declining';
    return 'stable';
  }, [moodHistory]);

  return {
    currentMood,
    moodConfidence,
    moodHistory,
    isAssessing,
    setIsAssessing,
    updateMood,
    getMoodColor,
    getMoodEmoji,
    getMoodLabel,
    getConfidenceLevel,
    getConfidenceColor,
    clearMood,
    clearHistory,
    getRecentMoods,
    getMoodTrend,
    MOOD_COLORS,
    MOOD_EMOJIS,
    MOOD_LABELS,
  };
};