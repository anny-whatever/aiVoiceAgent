import { useState, useCallback } from 'react';
import { MoodAssessment } from '../types';

export function useMood() {
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [moodConfidence, setMoodConfidence] = useState<number>(0);
  const [moodHistory, setMoodHistory] = useState<MoodAssessment[]>([]);

  const updateMood = useCallback((mood: string | null, confidence: number = 0) => {
    setCurrentMood(mood);
    setMoodConfidence(confidence);
    
    if (mood) {
      const assessment: MoodAssessment = {
        mood: mood as "energetic" | "content" | "neutral" | "tired" | "stressed",
        confidence,
      };
      
      setMoodHistory(prev => {
        const newHistory = [...prev, assessment];
        // Keep only the last 10 mood assessments
        return newHistory.slice(-10);
      });
    }
  }, []);

  const clearMood = useCallback(() => {
    setCurrentMood(null);
    setMoodConfidence(0);
  }, []);

  const clearMoodHistory = useCallback(() => {
    setMoodHistory([]);
  }, []);

  const getMoodColor = useCallback((mood: string | null): string => {
    switch (mood) {
      case 'energetic':
        return '#FF6B6B'; // Red
      case 'content':
        return '#4ECDC4'; // Teal
      case 'neutral':
        return '#95A5A6'; // Gray
      case 'tired':
        return '#3498DB'; // Blue
      case 'stressed':
        return '#F39C12'; // Orange
      default:
        return '#BDC3C7'; // Light gray
    }
  }, []);

  const getMoodEmoji = useCallback((mood: string | null): string => {
    switch (mood) {
      case 'energetic':
        return '⚡';
      case 'content':
        return '😊';
      case 'neutral':
        return '😐';
      case 'tired':
        return '😴';
      case 'stressed':
        return '😰';
      default:
        return '❓';
    }
  }, []);

  const getAverageMoodConfidence = useCallback((): number => {
    if (moodHistory.length === 0) return 0;
    
    const totalConfidence = moodHistory.reduce((sum, assessment) => sum + assessment.confidence, 0);
    return totalConfidence / moodHistory.length;
  }, [moodHistory]);

  const getMostFrequentMood = useCallback((): string | null => {
    if (moodHistory.length === 0) return null;
    
    const moodCounts: Record<string, number> = {};
    
    moodHistory.forEach(assessment => {
      moodCounts[assessment.mood] = (moodCounts[assessment.mood] || 0) + 1;
    });
    
    let mostFrequent = null;
    let maxCount = 0;
    
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = mood;
      }
    });
    
    return mostFrequent;
  }, [moodHistory]);

  return {
    currentMood,
    moodConfidence,
    moodHistory,
    updateMood,
    clearMood,
    clearMoodHistory,
    getMoodColor,
    getMoodEmoji,
    getAverageMoodConfidence,
    getMostFrequentMood,
    setCurrentMood,
    setMoodConfidence,
  };
}