import { useState, useCallback, useRef } from 'react';
import { UserMood } from '../../../backend/src/types/mood';
// Video mood is now frontend-only, no URL params needed

interface VideoMoodState {
  mood: UserMood | null;
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
    confidence: 0,
    isActive: false,
    lastUpdated: null
  });

  // Video mood is now frontend-only, no debouncing needed

  const updateVideoMood = useCallback(async (mood: string, confidence: number, expressions?: Record<string, number>) => {
    // Map string mood to UserMood enum
    const moodMapping: { [key: string]: UserMood } = {
      'happy': UserMood.HAPPY,
      'content': UserMood.CONTENT,
      'neutral': UserMood.NEUTRAL,
      'tired': UserMood.TIRED,
      'stressed': UserMood.STRESSED
    };

    const mappedMood = moodMapping[mood] || UserMood.NEUTRAL;
    
    setVideoMood(prev => ({
      ...prev,
      mood: mappedMood,
      confidence,
      lastUpdated: new Date()
    }));

    // Video mood is now frontend-only, no backend integration
  }, []);

  const clearVideoMood = useCallback(() => {
    setVideoMood({
      mood: null,
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

  const getVideoMoodEmoji = useCallback((): string => {
    if (!videoMood.mood) return '😐';
    
    const emojiMap: { [key in UserMood]: string } = {
      [UserMood.HAPPY]: '😊',
      [UserMood.CONTENT]: '😌',
      [UserMood.NEUTRAL]: '😐',
      [UserMood.TIRED]: '😴',
      [UserMood.STRESSED]: '😰'
    };
    
    return emojiMap[videoMood.mood];
  }, [videoMood.mood]);

  const getVideoMoodColor = useCallback((): string => {
    if (!videoMood.mood) return 'text-gray-500';
    
    const colorMap: { [key in UserMood]: string } = {
      [UserMood.HAPPY]: 'text-green-500',
      [UserMood.CONTENT]: 'text-blue-500',
      [UserMood.NEUTRAL]: 'text-gray-500',
      [UserMood.TIRED]: 'text-purple-500',
      [UserMood.STRESSED]: 'text-red-500'
    };
    
    return colorMap[videoMood.mood];
  }, [videoMood.mood]);

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