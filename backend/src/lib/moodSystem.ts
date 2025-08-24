import {
  UserMood,
  MoodAssessment,
  UserSession,
  MOOD_CHARACTERISTICS,
} from "../types/mood";

/**
 * In-memory session storage for mood data
 * In production, this would be replaced with Redis or a database
 */
const activeSessions = new Map<string, UserSession>();

/**
 * Analyzes user's response to assess their current mood using AI with tone analysis
 * This function is called by the AI agent tool for both initial and continuous mood monitoring
 */
export async function assessUserMood(
  userId: string,
  userResponse: string,
  sessionId: string,
  previousMood?: UserMood
): Promise<MoodAssessment> {
  console.log(
    `🧠 AI Assessing mood for user ${userId}: "${userResponse.substring(
      0,
      100
    )}..."${previousMood ? ` (Previous: ${previousMood})` : ""}`
  );

  try {
    // Get current session to check for previous mood
    const currentSession = getSessionData(userId, sessionId);
    const currentMood = previousMood || currentSession?.currentMood?.mood;

    const moodContext = currentMood
      ? `The user's previous mood was "${currentMood}". Detect if their mood has changed or remains the same.`
      : "This is the first mood assessment for this user in this session.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert human emotion and tone analyst who understands ALL languages. Analyze EVERY human response for emotional undertones, context, and implied mood - even in seemingly neutral statements. You will receive responses in ANY language (English, Spanish, French, German, etc.) and must detect the underlying emotional state and tone regardless of language.

LANGUAGE SUPPORT: Analyze emotional content in any language and respond in English with mood assessment.

AVAILABLE MOODS (choose exactly one):
- ecstatic: Over the moon, thrilled, euphoric, extremely happy, beyond excited
- excited: High energy, enthusiastic, pumped, eager, very positive
- happy: Joyful, cheerful, upbeat, pleased, good spirits
- content: Satisfied, peaceful, balanced, good, fine, comfortable
- neutral: Baseline, standard, no strong emotion, just okay
- calm: Relaxed, serene, composed, tranquil, at peace
- tired: Fatigued, drained, low energy, weary, exhausted
- sad: Down, melancholy, unhappy, disappointed, blue
- frustrated: Annoyed, irritated, blocked, impatient, stuck
- stressed: Anxious, overwhelmed, pressured, tense, worried
- angry: Mad, furious, rage, hostile, very upset

UNIVERSAL ANALYSIS RULES - ANALYZE EVERYTHING IN ANY LANGUAGE:
1. DIRECT emotions: "I'm happy", "Estoy feliz", "Je suis heureux", "Ich bin glücklich"
2. INDIRECT emotions: "not so good", "no muy bien", "pas terrible", "nicht so gut"
3. NEUTRAL requests: "Tell me about my trips", "Dime sobre mis viajes", "Parle-moi de mes trajets"
4. QUESTIONS: "What's the traffic like?", "¿Cómo está el tráfico?", "Comment est la circulation?"
5. COMMANDS: "Turn left", "Gira a la izquierda", "Tourne à gauche", "Biege links ab"
6. GREETINGS: "Hello", "Hola", "Salut", "Hallo" (detect energy level, enthusiasm, tiredness)
7. ACKNOWLEDGMENTS: "Thanks", "Gracias", "Merci", "Danke" (analyze satisfaction, resignation)
8. CASUAL responses: "whatever", "lo que sea", "peu importe", "was auch immer"
9. CONTEXT clues: Word choice, sentence structure, cultural expressions in any language
10. CROSS-LANGUAGE indicators: Emotional expressions transcend language barriers

MOOD CHANGE DETECTION:
${moodContext}
- If mood seems to have changed, choose the NEW mood with appropriate confidence
- If mood appears stable, confirm the current mood
- Be sensitive to even subtle emotional shifts

CONFIDENCE SCORING:
- 0.9-1.0: Very clear emotional indicators
- 0.7-0.8: Good evidence with some uncertainty
- 0.5-0.6: Moderate indicators, could be multiple moods
- 0.3-0.4: Weak signals, best guess
- 0.1-0.2: Very uncertain, minimal indicators

Respond ONLY with a JSON object in this exact format:
{
  "mood": "one_of_the_eleven_moods",
  "confidence": 0.75,
  "reasoning": "Brief explanation of semantic and tone analysis"
}`,
          },
          {
            role: "user",
            content: `Analyze this user response for emotional state and tone in ANY language. Even if it seems neutral or non-emotional, detect underlying mood, energy level, and emotional undertones from their word choice, context, and implied tone. The response may be in English, Spanish, French, German, or any other language: "${userResponse}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    // Parse AI response
    const moodAnalysis = JSON.parse(aiResponse);

    // Validate the mood is one of our enums
    const validMoods = Object.values(UserMood);
    if (!validMoods.includes(moodAnalysis.mood)) {
      throw new Error(`Invalid mood returned: ${moodAnalysis.mood}`);
    }

    // Ensure confidence is within bounds
    const confidence = Math.max(0, Math.min(1, moodAnalysis.confidence));

    const assessment: MoodAssessment = {
      mood: moodAnalysis.mood as UserMood,
      confidence,
      reasoning: moodAnalysis.reasoning || "AI mood and tone analysis",
      timestamp: new Date().toISOString(),
    };

    // Store in session
    updateSessionMood(userId, sessionId, assessment);

    // Log mood changes
    if (currentMood && currentMood !== assessment.mood) {
      console.log(
        `🔄 Mood change detected: ${currentMood} → ${
          assessment.mood
        } (confidence: ${confidence.toFixed(2)})`
      );
    }

    console.log(
      `✅ AI Mood assessed: ${
        assessment.mood
      } (confidence: ${confidence.toFixed(2)}) - ${assessment.reasoning}`
    );

    return assessment;
  } catch (error) {
    console.error("❌ AI mood assessment failed:", error);

    // Fallback to neutral with low confidence
    const fallbackAssessment: MoodAssessment = {
      mood: UserMood.NEUTRAL,
      confidence: 0.3,
      reasoning: "AI analysis failed, defaulting to neutral",
      timestamp: new Date().toISOString(),
    };

    updateSessionMood(userId, sessionId, fallbackAssessment);
    return fallbackAssessment;
  }
}

/**
 * Updates or creates a user session with mood data
 */
export function updateSessionMood(
  userId: string,
  sessionId: string,
  moodAssessment: MoodAssessment,
  conversationContext?: string
): void {
  const sessionKey = `${userId}:${sessionId}`;
  const existingSession = activeSessions.get(sessionKey);

  const session: UserSession = {
    userId,
    sessionId,
    currentMood: moodAssessment,
    conversationContext:
      conversationContext || existingSession?.conversationContext,
    createdAt: existingSession?.createdAt || new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  activeSessions.set(sessionKey, session);
  console.log(
    `📝 Session updated for ${userId} with mood: ${moodAssessment.mood}`
  );
}

/**
 * Retrieves current session data including mood
 */
export function getSessionData(
  userId: string,
  sessionId: string
): UserSession | null {
  const sessionKey = `${userId}:${sessionId}`;
  return activeSessions.get(sessionKey) || null;
}

/**
 * Generates mood-specific instructions for the AI agent
 */
export function generateMoodInstructions(mood: UserMood): string {
  const characteristics = MOOD_CHARACTERISTICS[mood];

  return `MOOD CONTEXT: The user is currently ${mood}. 

TONE ADJUSTMENT: Adopt a ${characteristics.tone} tone in all responses.

RESPONSE STYLE: ${characteristics.responseStyle}

ENERGY LEVEL: Match ${characteristics.energy} energy in your communication.

SUPPORT APPROACH: Provide ${characteristics.supportLevel}.

EXAMPLE RESPONSES FOR THIS MOOD:
${characteristics.examples.map((example) => `- "${example}"`).join("\n")}

Remember to maintain this mood-appropriate tone throughout the entire conversation while still providing helpful driving assistance.`;
}

/**
 * Cleans up old sessions (call periodically)
 */
export function cleanupOldSessions(maxAgeHours: number = 24): void {
  const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  for (const [key, session] of activeSessions.entries()) {
    if (new Date(session.lastUpdated) < cutoffTime) {
      activeSessions.delete(key);
      console.log(`🧹 Cleaned up old session: ${key}`);
    }
  }
}
