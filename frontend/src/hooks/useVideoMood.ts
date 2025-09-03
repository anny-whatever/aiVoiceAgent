import { useState, useCallback, useRef } from 'react';
import { UserMood } from '../../../backend/src/types/mood';
import { useVideoMoodDisplay } from './useVideoMoodDisplay';
// Video mood is now frontend-only, no URL params needed

interface VideoMoodState {
  mood: UserMood | null;
  originalEmotion: string | null; // Store the original detected emotion
  confidence: number;
  isActive: boolean;
  lastUpdated: Date | null;
}

interface UseVideoMoodReturn {
  videoMood: VideoMoodState;
  updateVideoMood: (mood: string, confidence: number) => void;
  clearVideoMood: () => void;
  setVideoMoodActive: (active: boolean) => void;
  getVideoMoodEmoji: () => string;
  getVideoMoodColor: () => string;
}

const useVideoMood = (): UseVideoMoodReturn => {
  const [videoMood, setVideoMood] = useState<VideoMoodState>({
    mood: null,
    originalEmotion: null,
    confidence: 0,
    isActive: false,
    lastUpdated: null
  });

  // Video mood is now frontend-only, no debouncing needed

  const updateVideoMood = useCallback(async (mood: string, confidence: number, expressions?: Record<string, number>) => {
    // Map string mood to UserMood enum - handle new specific emotions
    const moodMapping: { [key: string]: UserMood } = {
      'happy': UserMood.HAPPY,
      'content': UserMood.CONTENT,
      'neutral': UserMood.NEUTRAL,
      'tired': UserMood.TIRED,
      'stressed': UserMood.STRESSED,
      // Map new specific emotions to closest UserMood categories
      'sad': UserMood.TIRED,
      'angry': UserMood.STRESSED,
      'anxious': UserMood.STRESSED,
      'disgusted': UserMood.STRESSED,
      'surprised': UserMood.CONTENT
    };

    const mappedMood = moodMapping[mood] || UserMood.NEUTRAL;
    
    setVideoMood(prev => ({
      ...prev,
      mood: mappedMood,
      originalEmotion: mood, // Store the original emotion string
      confidence,
      lastUpdated: new Date()
    }));

    // Video mood is now frontend-only, no backend integration
  }, []);

  const clearVideoMood = useCallback(() => {
    setVideoMood({
      mood: null,
      originalEmotion: null,
      confidence: 0,
      isActive: false,
      lastUpdated: null
    });
  }, []);

  const setVideoMoodActive = useCallback((active: boolean) => {
    setVideoMood(prev => ({
      ...prev,
      isActive: active
    }));
  }, []);

  const { getSpecificMoodEmoji, getSpecificMoodColor } = useVideoMoodDisplay();

  const getVideoMoodEmoji = useCallback((): string => {
    if (!videoMood.originalEmotion) return '😐';
    return getSpecificMoodEmoji(videoMood.originalEmotion);
  }, [videoMood.originalEmotion, getSpecificMoodEmoji]);

  const getVideoMoodColor = useCallback((): string => {
    if (!videoMood.originalEmotion) return 'text-gray-500';
    return getSpecificMoodColor(videoMood.originalEmotion);
  }, [videoMood.originalEmotion, getSpecificMoodColor]);

  return {
    videoMood,
    updateVideoMood,
    clearVideoMood,
    setVideoMoodActive,
    getVideoMoodEmoji,
    getVideoMoodColor
  };
};

export default useVideoMood;