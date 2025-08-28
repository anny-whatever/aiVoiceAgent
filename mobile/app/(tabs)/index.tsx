import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
// RTCView not needed for audio-only streams

// Import hooks
import { useWebRTC } from '../../src/hooks/useWebRTC';
import { useAudio } from '../../src/hooks/useAudio';
import { useMood } from '../../src/hooks/useMood';
import { useUsers } from '../../src/hooks/useUsers';
import { useLanguages } from '../../src/hooks/useLanguages';
import { useQuota } from '../../src/hooks/useQuota';

// Import services
import { RealtimeEventHandler } from '../../src/services/realtimeService';
import { sendFunctionResult, sendResponseCreate, sendSessionUpdate } from '../../src/services/webrtc';
import { audioTestUtility } from '../../src/utils/audioTest';

// Import components
import {
  StatusIndicator,
  MoodDisplay,
  UserSelector,
  LanguageSelector,
  VoiceControls,
  InfoPanel,
  QuotaIndicator,
} from '../../src/components';

// Import types
import { User } from '../../src/types';

export default function HomeScreen() {
  // Custom hooks
  const webRTC = useWebRTC();
  const { userDing, aiDing, initializeAudio } = useAudio();
  const mood = useMood();
  const users = useUsers();
  const languages = useLanguages();
  const quota = useQuota();

  const audioRef = useRef<Audio.Sound | null>(null);
  const remoteStreamRef = useRef<any>(null);
  // Remote audio streams are handled automatically by react-native-webrtc

  // Initialize audio on app start
  useEffect(() => {
    initializeAudio();
    
    // Run audio tests in development mode
    if (__DEV__) {
      setTimeout(async () => {
        console.log('🧪 Running audio tests in development mode...');
        const testResults = await audioTestUtility.runAllTests();
        if (testResults.success) {
          console.log('✅ All audio systems ready for OpenAI Realtime API');
        } else {
          console.warn('⚠️ Some audio tests failed. Check logs for details.');
        }
      }, 2000); // Delay to allow app initialization
    }
  }, [initializeAudio]);

  // Create event handler with dependencies
  const eventHandler = new RealtimeEventHandler({
    selectedUser: users.selectedUser,
    dcRef: webRTC.refs.dc,
    backendUrl: "http://localhost:3001",
    setCurrentMood: mood.updateMood,
    setMoodConfidence: (confidence: number) => mood.updateMood(mood.currentMood, confidence),
    setIsListening: webRTC.setIsListening,
    setIsAISpeaking: webRTC.setIsAISpeaking,
    setStatus: webRTC.setStatus,
    micRef: webRTC.refs.mic,
    userDing,
    aiDing,
    sendSessionUpdate,
    sendFunctionResult,
    sendResponseCreate,
  });

  const handleStart = async () => {
    try {
      const { dc } = await webRTC.connect(
        users.selectedUser,
        eventHandler.handleEvent.bind(eventHandler),
        (stream) => {
          // Handle remote audio stream for React Native
          console.log('Remote stream received:', stream);
          
          // Enable the remote audio track
          const audioTracks = stream.getAudioTracks();
          console.log('Audio tracks found:', audioTracks.length);
          if (audioTracks.length > 0) {
            audioTracks[0].enabled = true;
            console.log('Remote audio track enabled:', {
              id: audioTracks[0].id,
              kind: audioTracks[0].kind,
              enabled: audioTracks[0].enabled,
              readyState: audioTracks[0].readyState,
              muted: audioTracks[0].muted
            });
          } else {
            console.warn('No audio tracks found in remote stream');
          }
          
          // Store reference to the remote stream
          remoteStreamRef.current = stream;
          console.log('Audio will be played automatically by react-native-webrtc');
          
          // Set audio session to ensure proper playback routing
          Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              shouldDuckAndroid: false, // Don't duck during AI speech
              playThroughEarpieceAndroid: false,
            }).catch(error => {
              console.warn('Failed to set audio mode for remote stream:', error);
            });
        },
        (sessionInfo) => {
          // Update quota status
          quota.fetchQuotaStatus();
        }
      );

      webRTC.setupSession(
        users.selectedUser,
        users.users,
        languages.selectedLanguage.code,
        languages.selectedLanguage.nativeName
      );
    } catch (error) {
      console.error('Failed to start:', error);
      Alert.alert('Connection Error', 'Failed to start voice chat. Please try again.');
    }
  };

  const handleStop = () => {
    // Clean up remote audio stream reference
    if (remoteStreamRef.current) {
      const stream = remoteStreamRef.current;
      if (stream.getAudioTracks) {
        stream.getAudioTracks().forEach((track: any) => {
          track.enabled = false;
          track.stop();
        });
      }
      remoteStreamRef.current = null;
    }
    
    // Remote stream cleaned up above
    
    webRTC.disconnect();
    mood.clearMood();
  };

  // Handle automatic session termination
  useEffect(() => {
    if (quota.quotaStatus.isCritical && webRTC.connectionStatus.isConnected) {
      console.log('Session terminated due to quota limit, disconnecting...');
      handleStop();
      Alert.alert('Session Ended', 'Your session has ended due to quota limits.');
    }
  }, [quota.quotaStatus.isCritical, webRTC.connectionStatus.isConnected]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Drival</Text>

        <StatusIndicator connectionStatus={webRTC.connectionStatus} />

        {webRTC.connectionStatus.isConnected && (
          <QuotaIndicator quotaStatus={quota.quotaStatus} />
        )}

        <MoodDisplay
          currentMood={mood.currentMood || 'neutral'}
          moodConfidence={mood.moodConfidence}
          getMoodEmoji={mood.getMoodEmoji}
          getMoodColor={mood.getMoodColor}
        />

        {!webRTC.connectionStatus.isConnected && (
          <>
            <UserSelector
              users={users.users}
              selectedUser={users.getSelectedUserData()}
              onUserChange={(user: User) => users.selectUser(user.id)}
              loading={users.isLoading}
            />

            <LanguageSelector
              languages={languages.languages}
              selectedLanguage={languages.selectedLanguage}
              onLanguageChange={languages.selectLanguage}
              loading={languages.isLoading}
            />
          </>
        )}

        <VoiceControls
          connectionStatus={webRTC.connectionStatus}
          onStart={handleStart}
          onStop={handleStop}
        />

        {/* Quota Warning */}
        {quota.quotaStatus.isWarning && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ Low quota remaining: {quota.quotaStatus.percentage}%
            </Text>
          </View>
        )}

        {/* Critical Quota */}
        {quota.quotaStatus.isCritical && (
          <View style={styles.criticalContainer}>
            <Text style={styles.criticalText}>
              🚫 Critical: Very low quota remaining
            </Text>
          </View>
        )}

        <InfoPanel />
        
        {/* Audio-only streams are handled automatically by react-native-webrtc */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // gray-900
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#60a5fa', // blue-400
    marginBottom: 32,
    textAlign: 'center',
  },
  warningContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)', // yellow-500/20
    borderColor: 'rgba(245, 158, 11, 0.5)', // yellow-500/50
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    width: '100%',
  },
  warningText: {
    color: '#fcd34d', // yellow-300
    fontSize: 14,
    textAlign: 'center',
  },
  criticalContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)', // red-500/20
    borderColor: 'rgba(239, 68, 68, 0.5)', // red-500/50
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    width: '100%',
  },
  criticalText: {
    color: '#fca5a5', // red-300
    fontSize: 14,
    textAlign: 'center',
  },
  // RTCView styles removed - not needed for audio-only streams
});
