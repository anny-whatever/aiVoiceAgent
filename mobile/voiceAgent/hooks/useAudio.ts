import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function useAudio() {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Initialize audio sounds
  const initializeAudio = useCallback(async () => {
    try {
      // Audio initialization for mobile
      // In a real app, you might want to install expo-av or react-native-sound
      console.log('🔊 Audio initialized');
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
    }
  }, []);

  const userDing = useCallback(async () => {
    try {
      if (!isAudioEnabled) return;
      
      // Play user ding sound
      // This could be replaced with an actual sound file
      console.log('🔔 User ding');
      
      // Haptic feedback for user speaking
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('❌ Failed to play user ding:', error);
    }
  }, [isAudioEnabled]);

  const aiDing = useCallback(async () => {
    try {
      if (!isAudioEnabled) return;
      
      // Play AI ding sound
      console.log('🤖 AI ding');
      
      // Haptic feedback for AI speaking
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error('❌ Failed to play AI ding:', error);
    }
  }, [isAudioEnabled]);

  const toggleAudio = useCallback(() => {
    setIsAudioEnabled(prev => !prev);
  }, []);

  const cleanup = useCallback(async () => {
    try {
      // Cleanup audio resources
      console.log('🧹 Audio cleanup completed');
    } catch (error) {
      console.error('❌ Failed to cleanup audio:', error);
    }
  }, []);

  return {
    isAudioEnabled,
    initializeAudio,
    userDing,
    aiDing,
    toggleAudio,
    cleanup,
  };
}