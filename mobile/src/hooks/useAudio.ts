import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export const useAudio = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const initializeAudio = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }, []);

  const playDing = useCallback(async (type: 'user' | 'ai' = 'user') => {
    try {
      setIsLoading(true);
      
      // Unload previous sound if exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Try to create sound from file, fallback to system sound if files don't exist
      let soundSource;
      try {
        soundSource = type === 'user' 
          ? require('../../assets/sounds/user-ding.mp3')
          : require('../../assets/sounds/ai-ding.mp3');
      } catch (requireError) {
        console.log(`Audio file not found for ${type} ding, using system sound fallback`);
        // Use a simple system beep or just log the action
        console.log(`${type === 'user' ? 'User' : 'AI'} ding triggered`);
        setIsLoading(false);
        return;
      }

      // Create new sound
      const { sound } = await Audio.Sound.createAsync(
        soundSource,
        { shouldPlay: true }
      );
      
      soundRef.current = sound;
      setIsPlaying(true);

      // Set up playback status update
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });

    } catch (error) {
      console.error('Error playing ding:', error);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const userDing = useCallback(() => playDing('user'), [playDing]);
  const aiDing = useCallback(() => playDing('ai'), [playDing]);

  const stopAudio = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }, []);

  const cleanup = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
    } catch (error) {
      console.error('Error cleaning up audio:', error);
    }
  }, []);

  return {
    isPlaying,
    isLoading,
    initializeAudio,
    userDing,
    aiDing,
    stopAudio,
    cleanup,
  };
};