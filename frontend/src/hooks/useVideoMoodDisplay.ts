import { useCallback } from 'react';

/**
 * Hook for video mood display utilities - handles specific emotion indicators
 * Provides emojis and colors for the detailed emotions detected by face-api.js
 */
export const useVideoMoodDisplay = () => {
  
  const getSpecificMoodEmoji = useCallback((mood: string): string => {
    const emojiMap: { [key: string]: string } = {
      // Basic emotions
      'happy': '😊',
      'content': '😌', 
      'neutral': '😐',
      'tired': '😴',
      'stressed': '😰',
      // Specific face-api emotions
      'sad': '😢',
      'angry': '😠',
      'anxious': '😟',
      'disgusted': '🤢',
      'surprised': '😲',
      'fearful': '😨'
    };
    
    return emojiMap[mood] || '😐';
  }, []);

  const getSpecificMoodColor = useCallback((mood: string): string => {
    const colorMap: { [key: string]: string } = {
      // Basic emotions
      'happy': 'text-green-500',
      'content': 'text-blue-500',
      'neutral': 'text-gray-500', 
      'tired': 'text-purple-500',
      'stressed': 'text-red-500',
      // Specific face-api emotions
      'sad': 'text-blue-600',
      'angry': 'text-red-600',
      'anxious': 'text-yellow-600',
      'disgusted': 'text-green-600',
      'surprised': 'text-orange-500',
      'fearful': 'text-purple-600'
    };
    
    return colorMap[mood] || 'text-gray-500';
  }, []);

  const getSpecificMoodLabel = useCallback((mood: string): string => {
    const labelMap: { [key: string]: string } = {
      'happy': 'Happy',
      'content': 'Content',
      'neutral': 'Neutral',
      'tired': 'Tired', 
      'stressed': 'Stressed',
      'sad': 'Sad',
      'angry': 'Angry',
      'anxious': 'Anxious',
      'disgusted': 'Disgusted',
      'surprised': 'Surprised',
      'fearful': 'Fearful'
    };
    
    return labelMap[mood] || 'Unknown';
  }, []);

  return {
    getSpecificMoodEmoji,
    getSpecificMoodColor,
    getSpecificMoodLabel
  };
};

export default useVideoMoodDisplay;