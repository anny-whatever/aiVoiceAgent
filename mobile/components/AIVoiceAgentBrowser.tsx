import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

interface AIVoiceAgentBrowserProps {
  apiUrl?: string;
}

const DEFAULT_API_URL = 'https://newtest.complianceone.ai/?api=5a0fe6a5eb768c1bb43999b8aa56a7cf&uid=0RzeMsFE8EdpQSAFnh70VeyLnIr2';

export default function AIVoiceAgentBrowser({ apiUrl = DEFAULT_API_URL }: AIVoiceAgentBrowserProps) {
  const [isLoading, setIsLoading] = useState(false);

  const openAIVoiceAgent = async () => {
    try {
      setIsLoading(true);
      
      // Open the AI voice agent in the browser
      const result = await WebBrowser.openBrowserAsync(apiUrl, {
        // Configure browser options for better experience
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: '#000000',
        toolbarColor: '#ffffff',
        secondaryToolbarColor: '#f0f0f0',
        enableBarCollapsing: true,
        showInRecents: true,
      });
      
      console.log('WebBrowser result:', result);
      
      // Handle the result if needed
      if (result.type === 'cancel') {
        console.log('User cancelled the browser');
      }
    } catch (error) {
      console.error('Error opening AI Voice Agent:', error);
      Alert.alert(
        'Error',
        'Failed to open AI Voice Agent. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        AI Voice Agent
      </Text>
      
      <Text style={styles.description}>
        Launch the AI Voice Agent to start your conversation. 
        Make sure to allow microphone permissions when prompted.
      </Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={openAIVoiceAgent}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Opening...' : '🎤 Launch AI Voice Agent'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.note}>
        Note: This will open in your device's browser with microphone access.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#000',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
});