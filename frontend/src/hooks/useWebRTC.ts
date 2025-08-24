import { useRef, useState, useCallback } from "react";
import { WebRTCRefs, ConnectionStatus } from "../types";
import {
  connectRealtime,
  sendSessionUpdate,
  sendResponseCreate,
} from "../webrtc";
import { ApiService } from "../services/api";

export const useWebRTC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isListening: false,
    isAISpeaking: false,
    status: "Ready",
  });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Guard to avoid spamming retries
  const lastFailedResponseIdRef = useRef<string | null>(null);
  const retriedOnceForResponseRef = useRef<{ [key: string]: boolean }>({});

  const updateStatus = useCallback((updates: Partial<ConnectionStatus>) => {
    setConnectionStatus((prev) => ({ ...prev, ...updates }));
  }, []);

  const setIsConnected = useCallback(
    (connected: boolean) => {
      updateStatus({ isConnected: connected });
    },
    [updateStatus]
  );

  const setIsListening = useCallback(
    (listening: boolean) => {
      updateStatus({ isListening: listening });
    },
    [updateStatus]
  );

  const setIsAISpeaking = useCallback(
    (speaking: boolean) => {
      updateStatus({ isAISpeaking: speaking });
    },
    [updateStatus]
  );

  const setStatus = useCallback(
    (status: string) => {
      updateStatus({ status });
    },
    [updateStatus]
  );

  const connect = useCallback(
    async (
      selectedUser: string,
      onEvent: (event: any) => void,
      onRemoteTrack: (stream: MediaStream) => void
    ) => {
      try {
        setStatus("Connecting...");

        const { apiKey } = await ApiService.createSession(selectedUser);

        const { pc, dc, mic } = await connectRealtime({
          apiKey,
          backendUrl: "http://localhost:3001",
          onEvent,
          onRemoteTrack,
        });

        pcRef.current = pc;
        dcRef.current = dc;
        micRef.current = mic;

        return { pc, dc, mic };
      } catch (error) {
        console.error("Connection error:", error);
        setStatus(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
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
      micRef.current?.getTracks().forEach((t) => t.stop());
    } catch (error) {
      console.error("Disconnect error:", error);
    }

    dcRef.current = null;
    pcRef.current = null;
    micRef.current = null;

    setConnectionStatus({
      isConnected: false,
      isListening: false,
      isAISpeaking: false,
      status: "Disconnected",
    });
  }, []);

  const setupSession = useCallback(
    (selectedUser: string, users: any[]) => {
      if (!dcRef.current) return;

      const dc = dcRef.current;

      dc.onopen = () => {
        setIsConnected(true);
        setStatus("Connected — Setting up AI...");

        // Find the actual user name from users array
        const currentUser = users.find((user) => user.id === selectedUser);
        const userName = currentUser ? currentUser.name : selectedUser;

        console.log("🔧 Configuring session with tools...");
        sendSessionUpdate(dc, {
          turn_detection: {
            type: "semantic_vad",
            eagerness: "low",
          },
          modalities: ["text", "audio"],
          voice: "coral",
          max_response_output_tokens: 1000,
          tool_choice: "auto",
          instructions: `You are Drival, a personal driving assistant for ${userName}. Be brief and conversational.

CRITICAL FUNCTION USAGE RULES - DETECT ALL HUMAN EMOTIONAL EXPRESSIONS:
1. CALL assess_user_mood for ANY emotional content - direct, indirect, subtle, or implied
2. CALL it for tone indicators, energy levels, satisfaction levels, day quality, or ANY emotional state
3. CALL it for positive, negative, neutral expressions - ALL emotional content
4. CALL it for questions about feelings AND responses about feelings
5. For trip-related questions, use get_driving_data
6. You can call MULTIPLE functions in one response if needed

MANDATORY DETECTION OF ALL EMOTIONAL EXPRESSIONS:
- Direct: "I'm feeling happy", "I am sad", "I feel tired"
- Indirect: "not so good", "could be better", "amazing day", "rough morning"
- Quality statements: "great day", "terrible time", "awful", "wonderful", "okay", "fine"
- Tone words: "ugh", "yay", "meh", "wow", "sigh", "hmm"
- Energy indicators: "exhausted", "pumped", "drained", "energized", "sluggish"
- Satisfaction levels: "frustrated", "pleased", "disappointed", "thrilled", "annoyed"
- Day/time descriptions: "rough day", "good morning", "bad start", "perfect evening"
- Comparative statements: "better than yesterday", "worse today", "not as good"
- Casual expressions: "whatever", "sure", "I guess", "fine", "alright"

EXAMPLES OF WHEN TO CALL assess_user_mood (COMPREHENSIVE LIST):
- "I'm feeling great!" → CALL assess_user_mood
- "not so good so far" → CALL assess_user_mood  
- "could be better" → CALL assess_user_mood
- "rough day" → CALL assess_user_mood
- "amazing!" → CALL assess_user_mood
- "terrible" → CALL assess_user_mood
- "I'm tired" → CALL assess_user_mood
- "exhausted" → CALL assess_user_mood
- "ugh" → CALL assess_user_mood
- "yay!" → CALL assess_user_mood
- "whatever" → CALL assess_user_mood
- "fine" → CALL assess_user_mood
- "okay" → CALL assess_user_mood
- "awful traffic" → CALL assess_user_mood
- "love this song" → CALL assess_user_mood
- "hate waiting" → CALL assess_user_mood
- ANY word that indicates emotional state → CALL assess_user_mood

CONVERSATION FLOW:
1. Greet ${userName} by name and ask SPECIFICALLY about their mood/feelings (e.g., "How are you feeling today?", "What's your mood like right now?", "How are you doing emotionally today?")
2. When they respond about mood, IMMEDIATELY call assess_user_mood function
3. Adapt your tone based on the mood assessment result
4. Continue helping with driving assistance
5. CONSTANTLY monitor for mood changes - if they mention ANY new feeling, call assess_user_mood again
6. Always update your communication style based on the most recent mood assessment

INITIAL GREETING EXAMPLES:
- "Hi ${userName}! How are you feeling today?"
- "Hello ${userName}! What's your mood like right now?"
- "Hey ${userName}! How are you doing today?"

DO NOT ask about "how the day is going" - ask specifically about FEELINGS and MOOD.

You MUST use the available functions when appropriate. Mood can change during conversations - always stay alert for emotional content.`,
          tools: [
            {
              type: "function",
              name: "assess_user_mood",
              description:
                "MANDATORY: Call this function for ALL emotional expressions - direct ('I'm happy'), indirect ('not so good'), quality statements ('terrible day'), tone words ('ugh'), energy levels ('exhausted'), satisfaction ('frustrated'), or ANY emotional content. Detect subtle emotions, casual expressions, day descriptions, and implied feelings. This includes positive, negative, and neutral emotional indicators. Call for EVERY emotional expression throughout the conversation.",
              parameters: {
                type: "object",
                properties: {
                  userId: {
                    type: "string",
                    description: "The ID of the user whose mood to assess",
                    enum: ["user1", "user2"],
                  },
                  userResponse: {
                    type: "string",
                    description:
                      "The exact text of the user's response containing ANY emotional content - direct ('I'm happy'), indirect ('not so good so far'), quality statements ('terrible day'), tone words ('ugh'), energy indicators ('exhausted'), satisfaction levels ('frustrated'), or any emotional expression",
                  },
                  sessionId: {
                    type: "string",
                    description: "Current session ID for mood tracking",
                  },
                },
                required: ["userId", "userResponse", "sessionId"],
              },
            },
            {
              type: "function",
              name: "get_driving_data",
              description:
                "Get complete trip data for a category when user asks about their trips, routes, or driving history.",
              parameters: {
                type: "object",
                properties: {
                  userId: {
                    type: "string",
                    description: "The ID of the user whose data to retrieve",
                    enum: ["user1", "user2"],
                  },
                  category: {
                    type: "string",
                    enum: [
                      "work_commute",
                      "errands_shopping",
                      "social_visits",
                      "entertainment_dining",
                      "weekend_trips",
                      "medical_appointments",
                      "general",
                    ],
                    description: "Category of trip data to retrieve",
                  },
                  query: {
                    type: "string",
                    description: "Description of what the user is asking about",
                  },
                },
                required: ["userId", "category", "query"],
              },
            },
          ],
        });

        // Wait for session update to be processed, then start conversation
        setTimeout(() => {
          setStatus("Ready — AI is greeting you!");
          console.log("🔧 Triggering initial AI greeting...");

          // Create a system message to start the conversation
          dc.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: `Hello! I'm ${userName} and I'm ready to chat with my driving assistant. Please greet me and ask about my mood and feelings.`,
                  },
                ],
              },
            })
          );

          // Trigger AI response
          setTimeout(() => {
            console.log("🔧 Requesting AI response...");
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
