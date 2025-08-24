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
 * Analyzes user's response to assess their current mood
 * This function is called by the AI agent tool
 */
export function assessUserMood(
  userId: string,
  userResponse: string,
  sessionId: string
): MoodAssessment {
  console.log(
    `🧠 Assessing mood for user ${userId}: "${userResponse.substring(
      0,
      100
    )}..."`
  );

  // Normalize the response for analysis
  const response = userResponse.toLowerCase().trim();

  // Mood detection logic based on keywords, tone, and patterns
  let detectedMood: UserMood;
  let confidence: number;
  let reasoning: string;

  // Energetic indicators
  const energeticKeywords = [
    "amazing",
    "fantastic",
    "excited",
    "great",
    "awesome",
    "wonderful",
    "excellent",
    "pumped",
    "ready",
    "energized",
  ];
  const energeticPhrases = [
    "feeling great",
    "really good",
    "super excited",
    "can't wait",
  ];

  // Content indicators
  const contentKeywords = [
    "good",
    "fine",
    "well",
    "nice",
    "pleasant",
    "okay",
    "alright",
    "satisfied",
    "happy",
  ];
  const contentPhrases = ["pretty good", "doing well", "not bad", "quite nice"];

  // Tired indicators
  const tiredKeywords = [
    "tired",
    "exhausted",
    "sleepy",
    "drained",
    "weary",
    "fatigue",
    "worn out",
    "beat",
  ];
  const tiredPhrases = [
    "feeling tired",
    "so tired",
    "really exhausted",
    "need rest",
  ];

  // Stressed indicators
  const stressedKeywords = [
    "stressed",
    "anxious",
    "worried",
    "overwhelmed",
    "pressure",
    "hectic",
    "crazy",
    "frantic",
    "rushed",
  ];
  const stressedPhrases = [
    "so much to do",
    "running late",
    "really stressed",
    "feeling overwhelmed",
  ];

  // Neutral indicators
  const neutralKeywords = [
    "okay",
    "fine",
    "normal",
    "usual",
    "regular",
    "standard",
  ];
  const neutralPhrases = ["just okay", "nothing special", "same as usual"];

  // Count matches and analyze patterns
  const energeticMatches =
    energeticKeywords.filter((word) => response.includes(word)).length +
    energeticPhrases.filter((phrase) => response.includes(phrase)).length;

  const contentMatches =
    contentKeywords.filter((word) => response.includes(word)).length +
    contentPhrases.filter((phrase) => response.includes(phrase)).length;

  const tiredMatches =
    tiredKeywords.filter((word) => response.includes(word)).length +
    tiredPhrases.filter((phrase) => response.includes(phrase)).length;

  const stressedMatches =
    stressedKeywords.filter((word) => response.includes(word)).length +
    stressedPhrases.filter((phrase) => response.includes(phrase)).length;

  const neutralMatches =
    neutralKeywords.filter((word) => response.includes(word)).length +
    neutralPhrases.filter((phrase) => response.includes(phrase)).length;

  // Additional pattern analysis
  const hasExclamation = response.includes("!");
  const hasMultipleExclamations = (response.match(/!/g) || []).length > 1;
  const responseLength = response.length;
  const hasPositiveEmphasis =
    /really good|so good|very good|extremely|absolutely/.test(response);
  const hasNegativeEmphasis =
    /really bad|so bad|very tired|extremely|absolutely exhausted/.test(
      response
    );

  // Scoring system
  const scores = {
    energetic:
      energeticMatches * 2 +
      (hasMultipleExclamations ? 2 : hasExclamation ? 1 : 0) +
      (hasPositiveEmphasis ? 1 : 0),
    content: contentMatches * 1.5 + (hasExclamation ? 0.5 : 0),
    neutral: neutralMatches * 1.5 + (responseLength < 20 ? 1 : 0),
    tired:
      tiredMatches * 2 +
      (hasNegativeEmphasis ? 1 : 0) +
      (responseLength < 15 ? 0.5 : 0),
    stressed: stressedMatches * 2 + (hasNegativeEmphasis ? 1 : 0),
  };

  // Determine highest scoring mood
  const maxScore = Math.max(...Object.values(scores));
  const topMood = Object.entries(scores).find(
    ([_, score]) => score === maxScore
  )?.[0] as keyof typeof scores;

  // Map to UserMood enum and set confidence
  if (maxScore === 0) {
    detectedMood = UserMood.NEUTRAL;
    confidence = 0.5;
    reasoning = "No clear mood indicators detected, defaulting to neutral";
  } else {
    switch (topMood) {
      case "energetic":
        detectedMood = UserMood.ENERGETIC;
        confidence = Math.min(0.9, 0.6 + maxScore * 0.1);
        reasoning = `High energy indicators detected: ${energeticKeywords
          .filter((w) => response.includes(w))
          .join(", ")}`;
        break;
      case "content":
        detectedMood = UserMood.CONTENT;
        confidence = Math.min(0.85, 0.6 + maxScore * 0.08);
        reasoning = `Positive but balanced indicators: ${contentKeywords
          .filter((w) => response.includes(w))
          .join(", ")}`;
        break;
      case "tired":
        detectedMood = UserMood.TIRED;
        confidence = Math.min(0.9, 0.65 + maxScore * 0.1);
        reasoning = `Fatigue indicators detected: ${tiredKeywords
          .filter((w) => response.includes(w))
          .join(", ")}`;
        break;
      case "stressed":
        detectedMood = UserMood.STRESSED;
        confidence = Math.min(0.9, 0.65 + maxScore * 0.1);
        reasoning = `Stress indicators detected: ${stressedKeywords
          .filter((w) => response.includes(w))
          .join(", ")}`;
        break;
      default:
        detectedMood = UserMood.NEUTRAL;
        confidence = 0.6;
        reasoning = "Mixed indicators, leaning neutral";
    }
  }

  const assessment: MoodAssessment = {
    mood: detectedMood,
    confidence,
    reasoning,
    timestamp: new Date().toISOString(),
  };

  // Store in session
  updateSessionMood(userId, sessionId, assessment);

  console.log(
    `✅ Mood assessed: ${detectedMood} (confidence: ${confidence.toFixed(
      2
    )}) - ${reasoning}`
  );

  return assessment;
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
