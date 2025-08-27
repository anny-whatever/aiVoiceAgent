import { useRef, useState, useCallback } from "react";
import { WebRTCRefs, ConnectionStatus, SessionInfo } from "../types";
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
      onRemoteTrack: (stream: MediaStream) => void,
      onSessionCreated?: (sessionInfo: SessionInfo) => void
    ) => {
      try {
        setStatus("Connecting...");

        const { apiKey, sessionInfo } = await ApiService.createSession(selectedUser);
        
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

UNIVERSAL MOOD MONITORING - CALL FOR EVERYTHING:
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

NO EXCEPTIONS: Whether they're asking about trips, giving directions, expressing emotions, or saying anything at all - ALWAYS call assess_user_mood first. This ensures continuous tone and context monitoring for every interaction.

CONVERSATION FLOW:
1. Greet ${userName} by name and ask SPECIFICALLY about their mood/feelings
2. For EVERY user response (first, second, third, etc.), ALWAYS call assess_user_mood first
3. Adapt your tone based on the most recent mood assessment result
4. Continue helping with driving assistance while calling assess_user_mood for every response
5. Update your communication style based on the latest mood assessment after each response

UNIVERSAL RULE: For EVERY user response in the conversation:
- Call assess_user_mood with their exact response text
- Then provide your response and/or call other functions if needed
- This happens for EVERY response, not just emotional ones

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
              name: "send_heartbeat",
              description:
                "MANDATORY: Call this function every 60 seconds to track session usage and update quota. This is required for real-time quota monitoring and session management.",
              parameters: {
                type: "object",
                properties: {
                  timestamp: {
                    type: "string",
                    description: "Current timestamp in ISO format",
                  },
                },
                required: ["timestamp"],
              },
            },
            {
              type: "function",
              name: "assess_user_mood",
              description:
                "MANDATORY: Call this function for EVERY SINGLE user response in the conversation - no exceptions. Whether they're expressing emotions, asking about trips, giving directions, saying hello, or anything else, ALWAYS call this function first with their exact response text. This ensures continuous tone and context monitoring throughout the entire conversation. Call this for emotional responses, neutral responses, questions, statements, requests - EVERYTHING.",
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
                    text: `Hello! I'm ${userName} and I'm ready to chat with my driving assistant. My preferred language is ${languageNativeName}. Please greet me by name in ${languageNativeName} and ask specifically about how I'm feeling or my mood today in ${languageNativeName}. When I respond to your mood question, you MUST immediately use the assess_user_mood function.`,
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
