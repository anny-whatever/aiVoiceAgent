import { useRef, useState, useCallback } from 'react';
import { WebRTCRefs, ConnectionStatus, SessionInfo } from '../types';
import {
  connectRealtime,
  sendSessionUpdate,
  sendResponseCreate,
  cleanupWebRTC,
} from '../services/webrtc';
import { ApiService } from '../services/api';
import { MediaStream } from 'react-native-webrtc';

export const useWebRTC = () => {
  const pcRef = useRef<any>(null);
  const dcRef = useRef<any>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<any>(null);
  const lastFailedResponseIdRef = useRef<string | null>(null);
  const retriedOnceForResponseRef = useRef<boolean>(false);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isListening: false,
    isAISpeaking: false,
    status: 'Disconnected',
  });

  const setIsConnected = useCallback((connected: boolean) => {
    setConnectionStatus(prev => ({ ...prev, isConnected: connected }));
  }, []);

  const setIsListening = useCallback((listening: boolean) => {
    setConnectionStatus(prev => ({ ...prev, isListening: listening }));
  }, []);

  const setIsAISpeaking = useCallback((speaking: boolean) => {
    setConnectionStatus(prev => ({ ...prev, isAISpeaking: speaking }));
  }, []);

  const setStatus = useCallback((status: string) => {
    setConnectionStatus(prev => ({ ...prev, status }));
  }, []);

  const connect = useCallback(
    async (
      selectedUser: string,
      onEvent: (event: any) => void,
      onRemoteTrack: (stream: MediaStream) => void,
      onSessionCreated?: (sessionInfo: SessionInfo) => void
    ) => {
      try {
        setStatus('Connecting...');

        const { apiKey, sessionInfo } = await ApiService.createSession(selectedUser);
        
        // Notify about session creation
        onSessionCreated?.(sessionInfo);

        const { pc, dc, mic } = await connectRealtime({
          apiKey,
          backendUrl: 'http://localhost:3001',
          onEvent,
          onRemoteTrack,
        });

        pcRef.current = pc;
        dcRef.current = dc;
        micRef.current = mic;

        return { pc, dc, mic, sessionInfo };
      } catch (error) {
        console.error('Connection error:', error);
        setStatus(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        disconnect();
        throw error;
      }
    },
    [setStatus]
  );

  const disconnect = useCallback(() => {
    try {
      dcRef.current?.close();
      pcRef.current?.close();
      micRef.current?.getTracks().forEach((t: any) => t.stop());
      
      // Clean up React Native WebRTC resources
      cleanupWebRTC();
      
      // Clear session data
      ApiService.getSessionManager().clearSession();
    } catch (error) {
      console.error('Disconnect error:', error);
    }

    dcRef.current = null;
    pcRef.current = null;
    micRef.current = null;

    setConnectionStatus({
      isConnected: false,
      isListening: false,
      isAISpeaking: false,
      status: 'Disconnected',
    });
  }, []);

  const setupSession = useCallback(
    (
      selectedUser: string,
      users: any[],
      selectedLanguage: string = 'en',
      languageNativeName: string = 'English'
    ) => {
      if (!dcRef.current) return;

      const dc = dcRef.current;

      dc.onopen = () => {
        setIsConnected(true);
        setStatus('Connected — Setting up AI...');

        // Find the actual user name from users array
        const currentUser = users.find((user) => user.id === selectedUser);
        const userName = currentUser ? currentUser.name : selectedUser;

        console.log('🔧 Configuring session with tools...');
        sendSessionUpdate(dc, {
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
            create_response: true,
            interrupt_response: true,
          },
          modalities: ['text', 'audio'],
          voice: 'coral',
          max_response_output_tokens: 1000,
          tool_choice: 'auto',
          instructions: `You are Drival, a personal driving assistant for ${userName}. Be brief and conversational.

CRITICAL RULES:
1. ALWAYS call assess_user_mood for EVERY user response - no exceptions
2. Call assess_user_mood FIRST before any other response
3. Pass the user's EXACT response text to assess_user_mood
4. After mood assessment, provide your helpful response
5. Be empathetic and adjust tone based on detected mood
6. Keep responses concise and driving-focused
7. Use ${languageNativeName} language for all responses

Your personality: Friendly, supportive, safety-conscious driving companion who cares about the user's wellbeing and driving experience.`,
          tools: [
            {
              type: 'function',
              name: 'assess_user_mood',
              description:
                'MANDATORY: Call this function for EVERY SINGLE user response in the conversation - no exceptions. Whether they\'re expressing emotions, asking about trips, giving directions, saying hello, or anything else, ALWAYS call this function first with their exact response text.',
              parameters: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'string',
                    description: 'The ID of the user whose mood to assess',
                    enum: ['firebase_user_001_john_doe', 'firebase_user_002_jane_smith'],
                  },
                  userResponse: {
                    type: 'string',
                    description:
                      'The exact text of the user\'s response - EVERYTHING they say. This includes emotional expressions, trip requests, directions, greetings, questions, statements, or any response whatsoever.',
                  },
                  sessionId: {
                    type: 'string',
                    description: 'Current session ID for mood tracking',
                  },
                },
                required: ['userId', 'userResponse', 'sessionId'],
              },
            },
            {
              type: 'function',
              name: 'get_driving_data',
              description:
                'Get complete trip data for a category when user asks about their trips, routes, or driving history.',
              parameters: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'string',
                    description: 'The ID of the user whose data to retrieve',
                    enum: ['firebase_user_001_john_doe', 'firebase_user_002_jane_smith'],
                  },
                  category: {
                    type: 'string',
                    enum: [
                      'work_commute',
                      'errands_shopping',
                      'social_visits',
                      'entertainment_dining',
                      'weekend_trips',
                      'medical_appointments',
                      'general',
                    ],
                    description: 'Category of trip data to retrieve',
                  },
                  query: {
                    type: 'string',
                    description: 'Description of what the user is asking about',
                  },
                },
                required: ['userId', 'category', 'query'],
              },
            },
          ],
        });

        // Wait for session update to be processed, then start conversation
        setTimeout(() => {
          setStatus('Ready — AI is greeting you!');
          console.log('🔧 Triggering initial AI greeting...');

          // Create a system message to start the conversation
          dc.send(
            JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: `Hello! I'm ${userName} and I'm ready to chat with my driving assistant. My preferred language is ${languageNativeName}. Please greet me by name in ${languageNativeName} and ask specifically about how I'm feeling or my mood today in ${languageNativeName}. When I respond to your mood question, you MUST call assess_user_mood with my exact response before providing any other response.`,
                  },
                ],
              },
            })
          );

          // Trigger AI response
          setTimeout(() => {
            console.log('🔧 Requesting AI response...');
            sendResponseCreate(dc);
          }, 200);
        }, 1500);
      };
    },
    [setIsConnected, setStatus]
  );

  return {
    connectionStatus,
    refs: {
      pc: pcRef,
      dc: dcRef,
      mic: micRef,
      audio: audioRef,
    },
    retryRefs: {
      lastFailedResponseId: lastFailedResponseIdRef,
      retriedOnceForResponse: retriedOnceForResponseRef,
    },
    setIsConnected,
    setIsListening,
    setIsAISpeaking,
    setStatus,
    connect,
    disconnect,
    setupSession,
  };
};