/**
 * Mood system types for AI voice agent
 */

export enum UserMood {
  ENERGETIC = "energetic", // High energy, enthusiastic, upbeat
  CONTENT = "content", // Balanced, positive, satisfied
  NEUTRAL = "neutral", // Baseline, standard, no strong emotion
  TIRED = "tired", // Low energy, subdued, fatigued
  STRESSED = "stressed", // Anxious, overwhelmed, tense
}

export interface MoodAssessment {
  mood: UserMood;
  confidence: number; // 0-1 scale of confidence in assessment
  reasoning: string; // Brief explanation of mood detection
  timestamp: string; // ISO timestamp of assessment
}

export interface UserSession {
  userId: string;
  sessionId: string;
  currentMood?: MoodAssessment;
  conversationContext?: string;
  createdAt: string;
  lastUpdated: string;
}

export interface MoodCharacteristics {
  tone: string;
  responseStyle: string;
  energy: string;
  supportLevel: string;
  examples: string[];
}

export const MOOD_CHARACTERISTICS: Record<UserMood, MoodCharacteristics> = {
  [UserMood.ENERGETIC]: {
    tone: "upbeat, enthusiastic, encouraging",
    responseStyle: "Uses exclamation points, positive language, motivational",
    energy: "high, matches user's enthusiasm",
    supportLevel: "cheerleading, amplifying excitement",
    examples: [
      "That's awesome! Let's get you to your destination with some great route suggestions!",
      "Perfect timing! I've got some exciting options for your trip today!",
    ],
  },
  [UserMood.CONTENT]: {
    tone: "warm, friendly, conversational",
    responseStyle: "Balanced, pleasant, naturally engaging",
    energy: "moderate, comfortable, welcoming",
    supportLevel: "collaborative, companionable",
    examples: [
      "Sounds good! I'm here to help make your drive smooth and pleasant.",
      "Great to hear from you! Let's plan your trip together.",
    ],
  },
  [UserMood.NEUTRAL]: {
    tone: "professional but friendly, balanced",
    responseStyle: "Clear, helpful, neither overly casual nor formal",
    energy: "steady, reliable, consistent",
    supportLevel: "informative, practical assistance",
    examples: [
      "I'm ready to help you with your driving needs today.",
      "Let me assist you with your trip planning and navigation.",
    ],
  },
  [UserMood.TIRED]: {
    tone: "gentle, supportive, understanding",
    responseStyle: "Slower pace, softer language, caring",
    energy: "calm, soothing, patient",
    supportLevel: "nurturing, accommodating, considerate",
    examples: [
      "I understand you're feeling tired. Let me help make your drive as easy as possible.",
      "Take your time. I'll suggest the most comfortable route for you today.",
    ],
  },
  [UserMood.STRESSED]: {
    tone: "calming, reassuring, solution-focused",
    responseStyle: "Clear, direct, confidence-building",
    energy: "steady, grounding, stable",
    supportLevel: "problem-solving, stress-reducing, practical",
    examples: [
      "I'm here to help make things easier. Let's find the best route to reduce any stress.",
      "Don't worry, I'll handle the navigation details so you can focus on driving safely.",
    ],
  },
};
