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
        setStatus("Connected — AI is greeting you!");

        console.log("🔧 Sending basic session update...");
        sendSessionUpdate(dc, {
          turn_detection: {
            type: "semantic_vad",
            eagerness: "low",
          },
          modalities: ["text", "audio"],
          voice: "coral",
          max_response_output_tokens: 1000,
          instructions:
            "You are Drival, a personal driving assistant. Be brief and conversational. IMPORTANT: As soon as the session starts, you must greet the user by name and ask about their mood. Always use the user's name in greetings. CRITICAL MOOD DETECTION: When users express ANY feelings or emotional state (like 'good', 'nice', 'fine', 'great', 'okay', 'tired', 'stressed', etc.), ALWAYS call the assess_user_mood function FIRST, regardless of what else they say. If they mention other topics in the same response (like asking about trips), call MULTIPLE tools in sequence - mood first, then other tools. Examples: 'I'm good, tell me about my trips' = call assess_user_mood AND get_driving_data. When users ask about their trips, use the get_driving_data function which returns COMPLETE data for each category (all trips, sorted newest first). Use this complete data to give accurate answers about counts, dates, and latest trips.",
        });

        // Add tools configuration
        setTimeout(() => {
          console.log("🔧 Adding tools configuration...");
          sendSessionUpdate(dc, {
            tool_choice: "auto",
            tools: [
              {
                type: "function",
                name: "get_driving_data",
                description:
                  "Get complete trip data for a category. Returns ALL trips in that category sorted by date (newest first), giving you full context to answer accurately.",
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
                      description:
                        "Category of trip data to retrieve - you'll get ALL trips in this category",
                    },
                    query: {
                      type: "string",
                      description:
                        "Description of what the user is asking about (the query parameter is required but the function returns complete data regardless)",
                    },
                  },
                  required: ["userId", "category", "query"],
                },
              },
              {
                type: "function",
                name: "assess_user_mood",
                description:
                  "CRITICAL: Call this function IMMEDIATELY when users express ANY emotional state or feeling, regardless of what else they say. This includes words like: good, nice, fine, great, awesome, okay, alright, well, tired, stressed, excited, happy, sad, angry, frustrated, etc. Always call this FIRST before any other tools when mood is expressed.",
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
                        "The user's response about how they're feeling or their current state",
                    },
                    sessionId: {
                      type: "string",
                      description: "Current session ID for mood tracking",
                    },
                  },
                  required: ["userId", "userResponse", "sessionId"],
                },
              },
            ],
          });

          // Send automatic initial greeting after tools are configured
          setTimeout(() => {
            console.log("🔧 Sending initial greeting...");

            // Find the actual user name from users array
            const currentUser = users.find((user) => user.id === selectedUser);
            const userName = currentUser ? currentUser.name : selectedUser;

            // Create conversation item to trigger AI greeting
            dc.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "user",
                  content: [
                    {
                      type: "input_text",
                      text: `SYSTEM: Start the conversation by greeting ${userName} by their name and asking about their mood. Use a warm, friendly tone.`,
                    },
                  ],
                },
              })
            );

            // Trigger AI response
            setTimeout(() => {
              sendResponseCreate(dc);
            }, 100);
          }, 500);
        }, 1000);
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
