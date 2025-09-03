/**
 * Mood system types for AI voice agent
 */

export enum UserMood {
  HAPPY = "happy", // Joyful, cheerful, upbeat, pleased, excited, positive
  CONTENT = "content", // Satisfied, peaceful, balanced, good, calm
  NEUTRAL = "neutral", // Baseline, standard, no strong emotion
  TIRED = "tired", // Fatigued, drained, low energy, weary, sad
  STRESSED = "stressed", // Anxious, overwhelmed, pressured, tense, frustrated, angry
}

export interface MoodAssessment {
  mood: UserMood;
  confidence: number; // 0-1 scale of confidence in assessment
  reasoning: string; // Brief explanation of mood detection
  timestamp: string; // ISO timestamp of assessment
  source: 'speech' | 'video' | 'combined'; // Source of mood detection
}

export interface VideoMoodData {
  mood: UserMood;
  confidence: number;
  expressions: Record<string, number>; // Raw expression scores from face-api.js
  timestamp: string;
}

export interface UserSession {
  userId: string;
  sessionId: string;
  currentMood?: MoodAssessment;
  videoMood?: VideoMoodData;
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
  [UserMood.HAPPY]: {
    tone: "cheerful, upbeat, positive, joyful, enthusiastic",
    responseStyle: "Bright, optimistic, warm and friendly, animated",
    energy: "high, positive, uplifting, vibrant",
    supportLevel: "maintaining positivity, being encouraging, celebrating together",
    examples: [
      "That's wonderful! I'm happy to help make your drive even better.",
      "Great to hear! Let's plan a smooth and enjoyable trip for you.",
      "That's awesome! I'm really excited to help you plan this trip!",
    ],
  },
  [UserMood.CONTENT]: {
    tone: "warm, friendly, conversational, satisfied, peaceful",
    responseStyle: "Balanced, pleasant, naturally engaging, gentle",
    energy: "moderate, comfortable, welcoming, relaxed",
    supportLevel: "collaborative, companionable, maintaining peace",
    examples: [
      "Sounds good! I'm here to help make your drive smooth and pleasant.",
      "Great to hear from you! Let's plan your trip together.",
      "No worries at all. Let's take this nice and easy with your route planning.",
    ],
  },
  [UserMood.NEUTRAL]: {
    tone: "professional but friendly, balanced, steady",
    responseStyle: "Clear, helpful, neither overly casual nor formal",
    energy: "steady, reliable, consistent",
    supportLevel: "informative, practical assistance",
    examples: [
      "I'm ready to help you with your driving needs today.",
      "Let me assist you with your trip planning and navigation.",
    ],
  },
  [UserMood.TIRED]: {
    tone: "gentle, supportive, understanding, soft, compassionate",
    responseStyle: "Slower pace, softer language, caring, considerate",
    energy: "low, soothing, patient, comforting",
    supportLevel: "nurturing, accommodating, making things easier, emotional support",
    examples: [
      "I understand you're feeling tired. Let me help make your drive as easy as possible.",
      "Take your time. I'll suggest the most comfortable route for you today.",
      "I'm here for you. Let me help make your journey a little easier today.",
    ],
  },
  [UserMood.STRESSED]: {
    tone: "calming, reassuring, solution-focused, grounding, understanding",
    responseStyle: "Clear, direct, confidence-building, no additional pressure, helpful",
    energy: "steady, stable, controlled, focused",
    supportLevel: "stress-reducing, practical, taking over details, problem-solving",
    examples: [
      "I'm here to help make things easier. Let's find the best route to reduce any stress.",
      "Don't worry, I'll handle the navigation details so you can focus on driving safely.",
      "I get that this is frustrating. Let me help solve this quickly for you.",
    ],
  },
};
