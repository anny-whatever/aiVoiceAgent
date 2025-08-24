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
            content: `You are an expert human emotion analyst with advanced tone detection capabilities. Analyze ALL forms of emotional expression - direct, indirect, subtle, and implied. Detect emotions from ANY type of human expression.

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

COMPREHENSIVE EMOTION DETECTION RULES:
1. DIRECT expressions: "I'm happy", "I feel sad", "I am tired"
2. INDIRECT expressions: "not so good", "could be better", "amazing", "terrible"
3. QUALITY statements: "rough day", "great morning", "awful time", "perfect"
4. TONE words: "ugh", "yay", "meh", "wow", "sigh", "hmm"
5. ENERGY indicators: "exhausted", "pumped", "drained", "energized"
6. SATISFACTION levels: "frustrated", "pleased", "disappointed", "thrilled"
7. CASUAL expressions: "whatever", "sure", "I guess", "fine", "alright"
8. COMPARATIVE statements: "better than yesterday", "worse today", "not as good"
9. CONTEXT clues: Day descriptions, time references, situation assessments
10. SUBTLE undertones: Resignation, enthusiasm, apathy, excitement

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
            content: `Analyze this user response for ALL emotional content - direct, indirect, subtle, or implied. Look for mood indicators in ANY form of human expression: "${userResponse}"`,
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
