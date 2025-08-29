import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer } from 'expo-audio';

// Hooks
import { useWebRTC } from '@/hooks/useWebRTC';
import { useAudio } from '@/hooks/useAudio';
import { useMood } from '@/hooks/useMood';
import { useLanguages } from '@/hooks/useLanguages';
import { useQuota } from '@/hooks/useQuota';
import { usePermissions } from '@/hooks/usePermissions';

// Services
import { RealtimeEventHandler } from '@/services/realtimeService';
import { sendFunctionResult, sendResponseCreate, sendSessionUpdate } from '@/services/webrtc';

// Components
import {
  VoiceControls,
  StatusIndicator,
  MoodDisplay,
  MoodEmoji,
  LanguageSelector,
  InfoPanel,
  QuotaIndicator,
} from '@/components';

// Utils
import { getAppConfig, validateConfig, AppConfig } from '@/utils/config';

export default function HomeScreen() {
  // Custom hooks
  const webRTC = useWebRTC();
  const { userDing, aiDing } = useAudio();
  const mood = useMood();
  const languages = useLanguages();
  const quota = useQuota();
  const permissions = usePermissions();
  
  // App config state
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Helper function for mood emoji
  const getMoodEmoji = (mood: string | null): string => {
    if (!mood) return '😐';
    const moodEmojis: { [key: string]: string } = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      excited: '🤩',
      calm: '😌',
      anxious: '😰',
      confused: '😕',
      surprised: '😲',
      neutral: '😐',
    };
    return moodEmojis[mood.toLowerCase()] || '😐';
  };

  // Helper function for mood color
  const getMoodColor = (mood: string | null): string => {
    if (!mood) return '#6b7280';
    const moodColors: { [key: string]: string } = {
      happy: '#10b981',
      sad: '#3b82f6',
      angry: '#ef4444',
      excited: '#f59e0b',
      calm: '#8b5cf6',
      anxious: '#f97316',
      confused: '#6b7280',
      surprised: '#ec4899',
      neutral: '#6b7280',
    };
    return moodColors[mood.toLowerCase()] || '#6b7280';
  };
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize app configuration
  useEffect(() => {
    try {
      const config = getAppConfig();
      const validation = validateConfig(config);
      
      if (!validation.isValid) {
        setConfigError(validation.error || 'Configuration validation failed');
        console.error('Configuration error:', validation.error);
      } else {
        setAppConfig(config);
        console.log('Initialized with config:', { 
          uid: config.uid, 
          apiKey: config.apiKey ? '[REDACTED]' : null,
          backendUrl: config.backendUrl 
        });
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Unknown configuration error';
       setConfigError(errorMessage);
       console.error('Configuration error:', errorMessage);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Create event handler with dependencies
  const eventHandler = appConfig ? new RealtimeEventHandler({
    selectedUser: appConfig.uid,
    dcRef: webRTC.refs.dc,
    backendUrl: appConfig.backendUrl,
    setCurrentMood: mood.setCurrentMood,
    setMoodConfidence: mood.setMoodConfidence,
    setIsListening: webRTC.setIsListening,
    setIsAISpeaking: webRTC.setIsAISpeaking,
    setStatus: webRTC.setStatus,
    micRef: webRTC.refs.mic,
    userDing,
    aiDing,
    sendSessionUpdate,
    sendFunctionResult,
    sendResponseCreate,
  }) : null;

  const handleStart = async () => {
    if (!appConfig) {
      console.error('Cannot start: App configuration not loaded');
      return;
    }

    if (!permissions.allPermissionsGranted) {
      const result = await permissions.setupAudioPermissions();
      if (!result.success) {
        Alert.alert('Permission Required', result.message || 'Audio permissions are required to use this app.');
        return;
      }
    }
    
    try {
      const { dc } = await webRTC.connect(
        appConfig.uid,
        eventHandler?.handleEvent.bind(eventHandler) || (() => {}),
        async (stream) => {
          // Handle remote audio stream
          try {
            // Note: For remote audio streams, we might need to handle this differently
            // as useAudioPlayer typically works with static audio sources
            console.log('Remote audio stream received:', stream);
          } catch (error) {
            console.error('Error handling remote audio:', error);
          }
        },
        (sessionInfo) => {
          // Initialize WebSocket connection for quota updates
          // quota.initializeWebSocket(); // TODO: Implement WebSocket for mobile
          quota.updateQuotaStatus();
          // Start the live timer countdown
          quota.startTimer();
        },
        appConfig.apiKey,
        appConfig.uid
      );

      // Fetch real user data from the API
      try {
        const response = await fetch(`${appConfig.backendUrl}/api/user/${appConfig.uid}?api=${appConfig.apiKey}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user data: ${response.status}`);
        }
        
        const userData = await response.json();
        
        if (!userData.success || !userData.user) {
          throw new Error('Invalid user data received from API');
        }
        
        // Create users array with real user data
        const users = [{
          id: userData.user.id,
          name: userData.user.name || `User ${userData.user.id}`
        }];
        
        webRTC.setupSession(
          appConfig.uid,
          users,
          languages.selectedLanguage,
          languages.getLanguageNativeName(languages.selectedLanguage)
        );
      } catch (userFetchError) {
        console.error('Failed to fetch user data, falling back to mock:', userFetchError);
        // Fallback to mock users if API call fails
        const mockUsers = [{ id: appConfig.uid, name: `User ${appConfig.uid}` }];
        
        webRTC.setupSession(
          appConfig.uid,
          mockUsers,
          languages.selectedLanguage,
          languages.getLanguageNativeName(languages.selectedLanguage)
        );
      }
    } catch (error) {
      console.error('Failed to start:', error);
      Alert.alert('Connection Error', 'Failed to start voice session. Please try again.');
    }
  };

  const handleStop = () => {
    webRTC.disconnect();
    mood.clearMood();
    // Stop the timer and reset session
    quota.stopTimer();
    quota.resetSession();
  };

  // Handle automatic session termination
  useEffect(() => {
    if (quota.isSessionTerminated && webRTC.connectionStatus.isConnected) {
      console.log('Session terminated due to time limit, disconnecting...');
      handleStop();
    }
  }, [quota.isSessionTerminated, webRTC.connectionStatus.isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStop();
    };
  }, []);

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#000000', '#1f2937', '#000000']}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Initializing...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#000000', '#1f2937', '#000000']}
        style={styles.gradient}
      >
        {/* Background decoration */}
        <LinearGradient
          colors={['rgba(234, 88, 12, 0.05)', 'rgba(220, 38, 38, 0.05)']} 
          style={styles.backgroundDecoration}
        />
        
        {/* Top Navigation */}
        <View style={styles.topNavigation}>
          {/* Language Selector - Top Left */}
          {!webRTC.connectionStatus.isConnected && !configError && (
            <LanguageSelector
              languages={languages.languages}
              selectedLanguage={languages.selectedLanguage}
              onLanguageChange={languages.setSelectedLanguage}
            />
          )}
          {webRTC.connectionStatus.isConnected && <View />}
          
          {/* Mood + Info - Top Right */}
          <View style={styles.topRightContainer}>
            <MoodEmoji
              currentMood={mood.currentMood}
              getMoodEmoji={getMoodEmoji}
            />
            <InfoPanel />
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Configuration Error */}
          {configError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>❌ {configError}</Text>
            </View>
          )}

          {/* Status Indicator */}
          {webRTC.connectionStatus.isConnected && (
            <StatusIndicator
            connectionStatus={webRTC.connectionStatus}
          />
          )}

          {/* Mood Display */}
          {webRTC.connectionStatus.isConnected && mood.currentMood && (
            <MoodDisplay
              currentMood={mood.currentMood}
              moodConfidence={mood.moodConfidence}
              getMoodEmoji={getMoodEmoji}
              getMoodColor={getMoodColor}
            />
          )}

          {/* Voice Controls */}
          <VoiceControls
            connectionStatus={webRTC.connectionStatus}
            onStart={handleStart}
            onStop={handleStop}
            disabled={!!configError || !appConfig || permissions.isLoading}
          />

          {/* Quota Warning */}
          {quota.lastWarning && (
            <View style={styles.warningContainer}>
              <View style={styles.warningContent}>
                <Text style={styles.warningText}>
                  ⚠️ {quota.lastWarning.message}
                </Text>
                <Text 
                  style={styles.warningClose}
                  onPress={quota.clearWarning}
                >
                  ✕
                </Text>
              </View>
            </View>
          )}

          {/* Session Terminated */}
          {quota.isSessionTerminated && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                🚫 Session ended: {quota.terminationReason}
              </Text>
            </View>
          )}

          {/* Quota Indicator */}
          {webRTC.connectionStatus.isConnected && (
            <QuotaIndicator
            quotaStatus={quota.quotaStatus}
          />
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  backgroundDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
  },
  topNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    zIndex: 10,
  },
  topRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 8,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
  },
  warningContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    borderRadius: 8,
  },
  warningContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  warningText: {
    color: '#fcd34d',
    fontSize: 14,
    flex: 1,
  },
  warningClose: {
    color: '#fcd34d',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusIndicator: {
    marginBottom: 16,
  },
  moodDisplay: {
    marginBottom: 16,
  },
  quotaIndicator: {
    marginTop: 16,
  },
});
