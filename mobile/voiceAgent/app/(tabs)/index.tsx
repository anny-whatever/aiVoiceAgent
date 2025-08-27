import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import our custom hooks
import { useWebRTC } from '../../hooks/useWebRTC';
import { useAudio } from '../../hooks/useAudio';
import { useMood } from '../../hooks/useMood';
import { useUsers } from '../../hooks/useUsers';
import { useLanguages } from '../../hooks/useLanguages';

// Import our custom components
import {
  StatusIndicator,
  MoodDisplay,
  UserSelector,
  LanguageSelector,
  VoiceControls,
} from '../../components';

// Import environment configuration
import { Environment, validateEnvironment } from '../../constants/Environment';

export default function VoiceAgentScreen() {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize audio hook
  const { initializeAudio, userDing, aiDing, toggleAudio, cleanup: cleanupAudio } = useAudio();

  // Initialize mood hook
  const {
    currentMood,
    moodConfidence,
    updateMood,
    clearMood,
  } = useMood();

  // Initialize users hook
  const {
    users,
    selectedUser,
    loading: usersLoading,
    error: usersError,
    selectUser,
  } = useUsers({ backendUrl: Environment.BACKEND_URL });

  // Initialize languages hook
  const {
    languages,
    selectedLanguage,
    loading: languagesLoading,
    error: languagesError,
    selectLanguage,
  } = useLanguages({ backendUrl: Environment.BACKEND_URL });

  // Initialize WebRTC hook
  const {
    connectionStatus,
    connect,
    disconnect,
  } = useWebRTC({
    apiKey: Environment.OPENAI_API_KEY,
    backendUrl: Environment.BACKEND_URL,
    selectedUser: selectedUser || '',
    setCurrentMood: updateMood,
    setMoodConfidence: (confidence: number) => {
      // Update mood confidence if needed
      console.log('Mood confidence:', confidence);
    },
    userDing,
    aiDing,
  });

  // Initialize the app
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeAudio();
        setIsInitialized(true);
        console.log('🚀 Voice Agent initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Voice Agent:', error);
        Alert.alert(
          'Initialization Error',
          'Failed to initialize the Voice Agent. Please check your permissions and try again.',
          [{ text: 'OK' }]
        );
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      cleanupAudio();
      if (connectionStatus.isConnected) {
        disconnect();
      }
    };
  }, []);

  // Handle connection start
  const handleStart = async () => {
    if (!selectedUser) {
      Alert.alert(
        'No User Selected',
        'Please select a user before starting the voice agent.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await connect();
    } catch (error) {
      console.error('❌ Failed to start voice agent:', error);
      Alert.alert(
        'Connection Error',
        'Failed to start the voice agent. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle connection stop
  const handleStop = async () => {
    try {
      await disconnect();
      clearMood();
    } catch (error) {
      console.error('❌ Failed to stop voice agent:', error);
    }
  };

  // Show loading screen if not initialized
  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing Voice Agent...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎤 Voice Agent</Text>
          <Text style={styles.subtitle}>
            AI-powered voice conversation with mood detection
          </Text>
        </View>

        {/* Status Indicator */}
        <StatusIndicator
          status={connectionStatus.status}
          isConnected={connectionStatus.isConnected}
          isListening={connectionStatus.isListening}
          isAISpeaking={connectionStatus.isAISpeaking}
        />

        {/* Mood Display */}
        <MoodDisplay
          mood={currentMood}
          confidence={moodConfidence}
        />

        {/* User Selection */}
        <UserSelector
          users={users}
          selectedUser={selectedUser}
          onUserChange={selectUser}
          loading={usersLoading}
        />

        {/* Language Selection */}
        <LanguageSelector
          languages={languages}
          selectedLanguage={selectedLanguage}
          onLanguageChange={selectLanguage}
          loading={languagesLoading}
        />

        {/* Voice Controls */}
        <VoiceControls
          isConnected={connectionStatus.isConnected}
          isConnecting={connectionStatus.status === 'connecting'}
          onStart={handleStart}
          onStop={handleStop}
        />

        {/* Error Messages */}
        {(usersError || languagesError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>⚠️ Errors:</Text>
            {usersError && (
              <Text style={styles.errorText}>Users: {usersError}</Text>
            )}
            {languagesError && (
              <Text style={styles.errorText}>Languages: {languagesError}</Text>
            )}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to use:</Text>
          <Text style={styles.instructionText}>1. Select a user and language</Text>
          <Text style={styles.instructionText}>2. Tap "Start Voice Agent" to begin</Text>
          <Text style={styles.instructionText}>3. Speak naturally - the AI will respond</Text>
          <Text style={styles.instructionText}>4. Your mood will be detected automatically</Text>
          <Text style={styles.instructionText}>5. Tap "Stop" when finished</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    backgroundColor: '#FADBD8',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C0392B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#A93226',
    marginBottom: 4,
  },
  instructionsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498DB',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2980B9',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#1F4E79',
    marginBottom: 6,
    lineHeight: 20,
  },
});
