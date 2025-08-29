import { useRef, useCallback } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

export const useAudio = () => {
  // Create audio players for different beep sounds
  // Using base64 encoded beep sounds as data URIs
  const userBeepSource = {
    uri: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
  };
  
  const aiBeepSource = {
    uri: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
  };

  const userBeepPlayer = useAudioPlayer(userBeepSource);
  const aiBeepPlayer = useAudioPlayer(aiBeepSource);

  // Initialize audio mode for playback
  const initializeAudio = useCallback(async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch (error) {
      console.error('Failed to initialize audio mode:', error);
    }
  }, []);

  // Play user beep sound (lower frequency)
  const userDing = useCallback(async () => {
    try {
      // Reset to beginning and play
      userBeepPlayer.seekTo(0);
      userBeepPlayer.play();
    } catch (error) {
      console.error('Error playing user ding sound:', error);
      // Fallback: just log the ding
      console.log('🔔 User Ding! (600Hz)');
    }
  }, [userBeepPlayer]);

  // Play AI beep sound (higher frequency)
  const aiDing = useCallback(async () => {
    try {
      // Reset to beginning and play
      aiBeepPlayer.seekTo(0);
      aiBeepPlayer.play();
    } catch (error) {
      console.error('Error playing AI ding sound:', error);
      // Fallback: just log the ding
      console.log('🔔 AI Ding! (1000Hz)');
    }
  }, [aiBeepPlayer]);

  // Generic play ding function for backward compatibility
  const playDing = useCallback(async (frequency = 800, duration = 150) => {
    try {
      if (frequency <= 700) {
        await userDing();
      } else {
        await aiDing();
      }
    } catch (error) {
      console.error('Error playing ding sound:', error);
      console.log(`🔔 Ding! (${frequency}Hz, ${duration}ms)`);
    }
  }, [userDing, aiDing]);

  const controlMicrophone = useCallback(
    (micStream: any, enabled: boolean) => {
      // In React Native with react-native-webrtc-web-shim,
      // microphone control is handled differently
      if (micStream && micStream.getAudioTracks) {
        micStream.getAudioTracks().forEach((track: any) => {
          track.enabled = enabled;
        });
      }
    },
    []
  );

  // Cleanup function
  const cleanup = useCallback(async () => {
    try {
      // expo-audio players are automatically cleaned up by the useAudioPlayer hook
      // when the component unmounts, so no manual cleanup is needed
      console.log('Audio cleanup completed');
    } catch (error) {
      console.error('Error during audio cleanup:', error);
    }
  }, []);

  return {
    userDing,
    aiDing,
    playDing, // For backward compatibility
    controlMicrophone,
    initializeAudio,
    cleanup,
  };
};