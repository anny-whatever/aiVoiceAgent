import { useState, useCallback, useRef } from 'react';
import { UserMood } from '../../../backend/src/types/mood';
import { useVideoMoodDisplay } from './useVideoMoodDisplay';
import { parseURLParams } from '../utils/urlParams';
import { ApiService } from '../services/api';

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

  // Rate limiting: prevent sending data more than once every 5 seconds
  const lastSentRef = useRef<number>(0);

  // Function to send video mood data to backend
  const sendVideoMoodToBackend = useCallback(async (mood: string, confidence: number, expressions: Record<string, number>) => {
    try {
      // Rate limiting: prevent sending more than once every 5 seconds
      const now = Date.now();
      if (now - lastSentRef.current < 5000) {
        console.log('⏱️ Rate limited: skipping video mood send (too frequent)');
        return;
      }

      const urlParams = parseURLParams();
      if (!urlParams.uid || !urlParams.apiKey) {
        console.warn('Missing URL parameters for video mood API call');
        return;
      }

      const sessionToken = ApiService.getSessionManager().getSessionToken();
      if (!sessionToken) {
        console.warn('No session token available for video mood API call');
        return;
      }

      // Extract sessionId from the JWT token
      let sessionId: string;
      try {
        const tokenPayload = JSON.parse(atob(sessionToken.split('.')[1]));
        sessionId = tokenPayload.sessionId;
        if (!sessionId) {
          console.error('No sessionId found in token payload');
          return;
        }
      } catch (error) {
        console.error('Failed to decode session token:', error);
        return;
      }

      const BACKEND_URL = (import.meta as any).env.VITE_BACKEND || "http://localhost:3001";
      const response = await fetch(`${BACKEND_URL}/api/video-mood?api=${urlParams.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          userId: urlParams.uid,
          sessionId: sessionId,
          expressions: expressions,
          confidence: confidence
        })
      });

      if (!response.ok) {
        console.error('Failed to send video mood data to backend:', response.status);
        return;
      }

      const result = await response.json();
      console.log('✅ Video mood data sent to backend:', result);
      
      // Update last sent timestamp on successful send
      lastSentRef.current = now;
    } catch (error) {
      console.error('Error sending video mood data to backend:', error);
    }
  }, []);

  const updateVideoMood = useCallback((mood: string, confidence: number, expressions?: Record<string, number>) => {
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
    
    setVideoMood(prev => {
      // Only update if there's a significant mood change (different mood category)
      // Don't update for confidence changes within the same mood
      const hasSignificantMoodChange = prev.mood !== mappedMood;
      
      if (!hasSignificantMoodChange && prev.mood !== null) {
        // Same mood, just confidence change - don't update
        return prev;
      }
      
      // Send video mood data to backend when significant mood change occurs
      if (hasSignificantMoodChange && expressions) {
        sendVideoMoodToBackend(mood, confidence, expressions);
      }
      
      return {
        ...prev,
        mood: mappedMood,
        originalEmotion: mood,
        confidence,
        lastUpdated: new Date()
      };
    });
  }, [sendVideoMoodToBackend]);

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
  }, [videoMood.originalEmotion]);

  const getVideoMoodColor = useCallback((): string => {
    if (!videoMood.originalEmotion) return 'text-gray-500';
    return getSpecificMoodColor(videoMood.originalEmotion);
  }, [videoMood.originalEmotion]);

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