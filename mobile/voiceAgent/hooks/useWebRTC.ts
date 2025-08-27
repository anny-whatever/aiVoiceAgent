import { useState, useRef, useCallback } from 'react';
import { connectRealtime, checkAudioPermissions, stopMediaStream } from '../services/webrtc';
import { RealtimeEventHandler } from '../services/realtimeService';
import { ConnectionStatus, WebRTCRefs, EventHandlerArgs } from '../types';
import { MediaStream } from 'react-native-webrtc';

interface UseWebRTCProps {
  apiKey: string;
  backendUrl: string;
  selectedUser: string;
  setCurrentMood: (mood: string | null) => void;
  setMoodConfidence: (confidence: number) => void;
  userDing: () => void;
  aiDing: () => void;
}

export function useWebRTC({
  apiKey,
  backendUrl,
  selectedUser,
  setCurrentMood,
  setMoodConfidence,
  userDing,
  aiDing,
}: UseWebRTCProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isListening: false,
    isAISpeaking: false,
    status: 'Disconnected',
  });

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const webrtcRefs = useRef<WebRTCRefs>({ pc: null, dc: null, mic: null });
  const eventHandlerRef = useRef<RealtimeEventHandler | null>(null);

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

  const connect = useCallback(async () => {
    try {
      setStatus('Checking permissions...');
      
      // Check audio permissions first
      const hasPermission = await checkAudioPermissions();
      if (!hasPermission) {
        setStatus('Audio permission denied');
        return;
      }

      setStatus('Connecting...');

      // Create event handler args
      const eventHandlerArgs: EventHandlerArgs = {
        selectedUser,
        dcRef: { current: null },
        backendUrl,
        setCurrentMood,
        setMoodConfidence,
        setIsListening,
        setIsAISpeaking,
        setStatus,
        micRef: { current: null },
        userDing,
        aiDing,
        sendSessionUpdate: () => {}, // Will be set after connection
        sendFunctionResult: () => {}, // Will be set after connection
        sendResponseCreate: () => {}, // Will be set after connection
      };

      // Create event handler
      eventHandlerRef.current = new RealtimeEventHandler(eventHandlerArgs);

      // Connect to OpenAI Realtime API
      const { pc, dc, mic } = await connectRealtime({
        apiKey,
        backendUrl,
        onEvent: eventHandlerRef.current.handleEvent,
        onRemoteTrack: (stream: MediaStream) => {
          console.log('📺 Setting remote stream');
          setRemoteStream(stream);
        },
      });

      // Store references
      webrtcRefs.current = { pc, dc, mic };
      eventHandlerArgs.dcRef.current = dc;
      eventHandlerArgs.micRef.current = mic;

      setIsConnected(true);
      setStatus('Connected');

      console.log('✅ WebRTC connection established');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      setStatus(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnected(false);
    }
  }, [apiKey, backendUrl, selectedUser, setCurrentMood, setMoodConfidence, userDing, aiDing]);

  const disconnect = useCallback(() => {
    try {
      console.log('🔌 Disconnecting WebRTC...');

      // Stop media stream
      if (webrtcRefs.current.mic) {
        stopMediaStream(webrtcRefs.current.mic);
      }

      // Close data channel
      if (webrtcRefs.current.dc) {
        (webrtcRefs.current.dc as any).close();
      }

      // Close peer connection
      if (webrtcRefs.current.pc) {
        (webrtcRefs.current.pc as any).close();
      }

      // Clear references
      webrtcRefs.current = { pc: null, dc: null, mic: null };
      eventHandlerRef.current = null;
      setRemoteStream(null);

      // Reset state
      setConnectionStatus({
        isConnected: false,
        isListening: false,
        isAISpeaking: false,
        status: 'Disconnected',
      });

      console.log('✅ WebRTC disconnected');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }, []);

  return {
    connectionStatus,
    remoteStream,
    connect,
    disconnect,
  };
}