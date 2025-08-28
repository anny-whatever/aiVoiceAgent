import { useRef, useState, useCallback } from "react";
import { WebRTCRefs, ConnectionStatus, SessionInfo } from "../types";
import {
  connectRealtime,
  sendSessionUpdate,
  sendResponseCreate,
} from "../webrtc";
import { ApiService } from "../services/api";
import { heartbeatService } from "../services/heartbeatService";

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
      onRemoteTrack: (stream: MediaStream) => void,
      onSessionCreated?: (sessionInfo: SessionInfo) => void
    ) => {
      try {
        setStatus("Connecting...");

        const { apiKey, sessionInfo } = await ApiService.createSession();
        
        // Notify about session creation
        onSessionCreated?.(sessionInfo);

        const { pc, dc, mic } = await connectRealtime({
          apiKey,
          backendUrl: "http://localhost:3001",
          onEvent,
          onRemoteTrack,
        });

        pcRef.current = pc;
        dcRef.current = dc;
        micRef.current = mic;

        return { pc, dc, mic, sessionInfo };
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
    // Stop heartbeat service
    heartbeatService.stop();
    
    try {
      dcRef.current?.close();
      pcRef.current?.close();
      micRef.current?.getTracks().forEach((t) => t.stop());
      
      // Clear session data
      ApiService.getSessionManager().clearSession();
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
    (
      selectedUser: string,
      users: any[],
      selectedLanguage: string = "en",
      languageNativeName: string = "English"
    ) => {
      if (!dcRef.current) return;

      const dc = dcRef.current;

      dc.onopen = () => {
        setIsConnected(true);
        setStatus("Connected — Setting up AI...");

        // Start heartbeat service
        const sessionToken = ApiService.getSessionManager().getSessionToken();
        if (sessionToken) {
          heartbeatService.start(sessionToken, () => {
            // Handle session termination
            disconnect();
          });
        }

        // Find the actual user name from users array
        const currentUser = users.find((user) => user.id === selectedUser);
        const userName = currentUser ? currentUser.name : selectedUser;

        console.log("🔧 Configuring session with tools...");
        sendSessionUpdate(dc, {
          turn_detection: {
            "type": "server_vad",
      "threshold": 0.5,
      "prefix_padding_ms": 300,
      "silence_duration_ms": 500,
      "create_response": true, // only in conversation mode
      "interrupt_response": true, // only in conversation mode
          },
          modalities: ["text", "audio"],
          voice: "coral",
          max_response_output_tokens: 1000,
          tool_choice: "auto",
          instructions: `You are Drival, a personal driving assistant for ${userName}. Be brief and conversational.

SELECTED LANGUAGE: The user has selected ${languageNativeName} (${selectedLanguage}) as their preferred language. You MUST communicate in ${languageNativeName} throughout the conversation unless they explicitly switch languages.

VERY IMPORTANT: LANGUAGE RULES:
- Primary language: ${languageNativeName} (${selectedLanguage})
- ALWAYS respond in ${languageNativeName} 
- If user speaks a different language, adapt to that language but default back to ${languageNativeName}
- Maintain your personality and functionality while speaking ${languageNativeName}
- All greetings, responses, and assistance should be in ${languageNativeName}

VERY IMPORTANT: ALWAYS ADAPT YOUR TONE AND RESPONSE TO THE USER'S PREFERRED LANGUAGE.

CRITICAL FUNCTION USAGE RULES - CALL MOOD ASSESSMENT FOR EVERY RESPONSE:
1. MANDATORY: Call assess_user_mood for EVERY SINGLE user response - no exceptions, no matter what they say
2. Call it for ALL responses: emotional, neutral, questions, statements, trip requests, everything
3. ALWAYS call assess_user_mood FIRST before any other function
4. For trip-related questions, call assess_user_mood FIRST, then get_driving_data
5. You can call MULTIPLE functions in one response - mood assessment is always first

ABSOLUTE RULE: FOR EVERY USER RESPONSE, ALWAYS CALL assess_user_mood FIRST. Examples:
- "I'm happy" → assess_user_mood + respond
- "Tell me about my trips" → assess_user_mood + get_driving_data  
- "What time is it?" → assess_user_mood + respond
- "Turn left" → assess_user_mood + respond
- ANYTHING the user says → assess_user_mood FIRST, always

UNIVERSAL MOOD MONITORING - CALL FOR EVERYTHING EXCEPT INITIAL SYSTEM PROMPT:
- "I'm feeling great!" → CALL assess_user_mood
- "Tell me about my work commute" → CALL assess_user_mood  
- "What's the traffic like?" → CALL assess_user_mood
- "Turn left here" → CALL assess_user_mood
- "Thanks" → CALL assess_user_mood
- "Hello" → CALL assess_user_mood
- "Fine" → CALL assess_user_mood
- "Whatever" → CALL assess_user_mood
- "Show me my trips" → CALL assess_user_mood
- "I need directions" → CALL assess_user_mood
- LITERALLY EVERYTHING the user says → CALL assess_user_mood

IMPORTANT EXCEPTION: DO NOT call assess_user_mood for the initial system prompt that contains "Hello! I'm ${userName} and I'm ready to chat with my driving assistant". This is a system initialization message, not a real user speech.

CONVERSATION FLOW:
1. Greet ${userName} by name and ask SPECIFICALLY about their mood/feelings (DO NOT call assess_user_mood for this initial system prompt)
2. For EVERY actual user response after the greeting, ALWAYS call assess_user_mood first
3. Adapt your tone based on the most recent mood assessment result
4. Continue helping with driving assistance while calling assess_user_mood for every user response
5. Update your communication style based on the latest mood assessment after each response

UNIVERSAL RULE: For EVERY actual user response in the conversation (excluding the initial system prompt):
- Call assess_user_mood with their exact response text
- Then provide your response and/or call other functions if needed
- This happens for EVERY real user response, not just emotional ones

WORKFLOW FOR EVERY RESPONSE:
Step 1: User says something (anything) in any language
Step 2: Detect their language
Step 3: Call assess_user_mood with their exact words
Step 4: Respond appropriately in their language (and call other functions if needed)
Step 5: Continue conversation in their language until they switch languages

GREETING INSTRUCTION: Greet ${userName} in ${languageNativeName} and ask about their mood/feelings in ${languageNativeName}.

LANGUAGE-SPECIFIC GREETING EXAMPLES:
- English: "Hi ${userName}! How are you feeling today?"
- Spanish: "¡Hola ${userName}! ¿Cómo te sientes hoy?"
- French: "Salut ${userName}! Comment tu te sens aujourd'hui?"
- German: "Hallo ${userName}! Wie fühlst du dich heute?"
- Hindi: "नमस्ते ${userName}! आज आप कैसा महसूस कर रहे हैं?"
- Punjabi: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ ${userName}! ਤੁਸੀਂ ਅੱਜ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰ ਰਹੇ ਹੋ?"
- Marathi: "नमस्कार ${userName}! तुम्ही आज कसे वाटत आहात?"
- Bengali: "নমস্কার ${userName}! আজ আপনি কেমন অনুভব করছেন?"
- Urdu: "السلام علیکم ${userName}! آج آپ کیسا محسوس کر رہے ہیں؟"
- Tamil: "வணக்கம் ${userName}! இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?"
- Telugu: "నమస్కారం ${userName}! ఈరోజు మీరు ఎలా అనిపిస్తున్నది?"
- Gujarati: "નમસ્તે ${userName}! આજે તમે કેવું લાગે છે?"

USE THE SELECTED LANGUAGE: Start conversation in ${languageNativeName} immediately.
DO NOT ask about "how the day is going" - ask specifically about FEELINGS and MOOD in ${languageNativeName}.

You MUST use the available functions when appropriate. Mood can change during conversations - always stay alert for emotional content.`,
          tools: [
            {
              type: "function",
              name: "assess_user_mood",
              description:
                "Call this function for ALL actual user responses in the conversation. DO NOT call this function for the initial system prompt that contains 'Hello! I'm [userName] and I'm ready to chat with my driving assistant' - this is a system initialization message, not a real user speech. However, call this function for EVERY genuine user response after that, including responses to mood questions, trip requests, directions, greetings, or any other user input. This ensures continuous mood monitoring throughout the conversation.",
              parameters: {
                type: "object",
                properties: {
                  userId: {
                    type: "string",
                    description: "The firebase_uid of the user whose mood to assess",
                  },
                  userResponse: {
                    type: "string",
                    description:
                      "The exact text of the user's response - EVERYTHING they say. This includes emotional expressions, trip requests, directions, greetings, questions, statements, or any response whatsoever. Pass their complete response text for tone and context analysis.",
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
              name: "get_user_info",
              description:
                "Get user information including streak data, driving statistics, profile completion, and achievements when user asks about their personal stats or progress.",
              parameters: {
                type: "object",
                properties: {
                  userId: {
                    type: "string",
                    description: "The firebase_uid of the user whose data to retrieve",
                  },
                  query: {
                    type: "string",
                    description: "Description of what user information is being requested (e.g., 'streak', 'driving stats', 'profile', 'achievements')",
                  },
                },
                required: ["userId", "query"],
              },
            },
            {
              type: "function",
              name: "get_vehicle_info",
              description:
                "Get complete vehicle information when user asks about their cars, vehicle details, insurance, or vehicle condition.",
              parameters: {
                type: "object",
                properties: {
                  userId: {
                    type: "string",
                    description: "The firebase_uid of the user whose vehicle data to retrieve",
                  },
                  query: {
                    type: "string",
                    description: "Description of what vehicle information is being requested (e.g., 'primary vehicle', 'insurance', 'condition', 'all vehicles')",
                  },
                },
                required: ["userId", "query"],
              },
            },
            {
              type: "function",
              name: "get_driving_data",
              description:
                "Get complete trip data when user asks about their trips, routes, driving history, last trip, recent trips, or trips on specific dates.",
              parameters: {
                type: "object",
                properties: {
                  userId: {
                    type: "string",
                    description: "The firebase_uid of the user whose data to retrieve",
                  },
                  category: {
                    type: "string",
                    enum: [
                      "work_commute",
                      "errands_shopping",
                      "social_visits",
                      "leisure_recreation",
                      "medical_appointments",
                      "other",
                      "general",
                    ],
                    description: "Category of trip data to retrieve",
                  },
                  query: {
                    type: "string",
                    description: "Description of what the user is asking about (supports: 'last trip', 'last N trips', 'last week trips', specific dates)",
                  },
                  timeRange: {
                    type: "string",
                    enum: ["latest", "today", "yesterday", "last_week", "last_month", "all"],
                    description: "Time range for trip data (optional)",
                  },
                  startDate: {
                    type: "string",
                    description: "Start date for custom date range (YYYY-MM-DD format, optional)",
                  },
                  endDate: {
                    type: "string",
                    description: "End date for custom date range (YYYY-MM-DD format, optional)",
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
                    text: `Hello! I'm ${userName} and I'm ready to chat with my driving assistant. My preferred language is ${languageNativeName}. Please greet me by name in ${languageNativeName} and ask specifically about how I'm feeling or my mood today in ${languageNativeName}.`,
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
