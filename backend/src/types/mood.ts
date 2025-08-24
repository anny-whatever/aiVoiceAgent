/**
 * Mood system types for AI voice agent
 */

export enum UserMood {
  // Extremely Positive
  ECSTATIC = "ecstatic", // Over the moon, thrilled, euphoric, extremely happy
  EXCITED = "excited", // High energy, enthusiastic, pumped, eager

  // Positive
  HAPPY = "happy", // Joyful, cheerful, upbeat, pleased
  CONTENT = "content", // Satisfied, peaceful, balanced, good

  // Neutral/Calm
  NEUTRAL = "neutral", // Baseline, standard, no strong emotion
  CALM = "calm", // Relaxed, serene, composed, tranquil

  // Low Energy/Negative
  TIRED = "tired", // Fatigued, drained, low energy, weary
  SAD = "sad", // Down, melancholy, unhappy, disappointed

  // High Stress/Negative
  FRUSTRATED = "frustrated", // Annoyed, irritated, blocked, impatient
  STRESSED = "stressed", // Anxious, overwhelmed, pressured, tense
  ANGRY = "angry", // Mad, furious, rage, hostile
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
  [UserMood.ECSTATIC]: {
    tone: "extremely enthusiastic, celebrating, euphoric",
    responseStyle:
      "Multiple exclamation points, superlative language, over-the-top positive",
    energy: "maximum, explosive, contagious excitement",
    supportLevel: "amplifying joy, sharing in celebration",
    examples: [
      "WOW!! That's absolutely incredible! Let's make this the BEST drive ever!!",
      "Amazing!! I'm so excited to help you get there! This is going to be fantastic!!",
    ],
  },
  [UserMood.EXCITED]: {
    tone: "upbeat, enthusiastic, encouraging, energetic",
    responseStyle: "Exclamation points, positive language, motivational",
    energy: "high, matches user's enthusiasm",
    supportLevel: "cheerleading, amplifying excitement",
    examples: [
      "That's awesome! Let's get you to your destination with some great route suggestions!",
      "Perfect timing! I've got some exciting options for your trip today!",
    ],
  },
  [UserMood.HAPPY]: {
    tone: "joyful, cheerful, bright, positive",
    responseStyle: "Upbeat language, occasional exclamation, warm and friendly",
    energy: "elevated, pleasant, optimistic",
    supportLevel: "sharing joy, maintaining positive energy",
    examples: [
      "That's wonderful! I'm happy to help you with your drive today.",
      "Great! Let's find you a nice route and make this trip enjoyable.",
    ],
  },
  [UserMood.CONTENT]: {
    tone: "warm, friendly, conversational, satisfied",
    responseStyle: "Balanced, pleasant, naturally engaging",
    energy: "moderate, comfortable, welcoming",
    supportLevel: "collaborative, companionable",
    examples: [
      "Sounds good! I'm here to help make your drive smooth and pleasant.",
      "Great to hear from you! Let's plan your trip together.",
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
  [UserMood.CALM]: {
    tone: "serene, peaceful, gentle, composed",
    responseStyle: "Soft language, flowing sentences, tranquil approach",
    energy: "low, soothing, relaxed",
    supportLevel: "maintaining peace, gentle guidance",
    examples: [
      "No worries at all. Let's take this nice and easy with your route planning.",
      "I'll help you find a peaceful, comfortable drive today.",
    ],
  },
  [UserMood.TIRED]: {
    tone: "gentle, supportive, understanding, soft",
    responseStyle: "Slower pace, softer language, caring, considerate",
    energy: "low, soothing, patient",
    supportLevel: "nurturing, accommodating, making things easier",
    examples: [
      "I understand you're feeling tired. Let me help make your drive as easy as possible.",
      "Take your time. I'll suggest the most comfortable route for you today.",
    ],
  },
  [UserMood.SAD]: {
    tone: "compassionate, empathetic, gentle, caring",
    responseStyle: "Soft, understanding, avoid overly cheerful language",
    energy: "low, respectful, comforting",
    supportLevel: "emotional support, gentle assistance",
    examples: [
      "I'm here for you. Let me help make your journey a little easier today.",
      "I understand. Let's find you a quiet, comfortable route.",
    ],
  },
  [UserMood.FRUSTRATED]: {
    tone: "understanding, solution-focused, acknowledging difficulty",
    responseStyle:
      "Direct, helpful, avoiding anything that might add to frustration",
    energy: "controlled, focused, efficient",
    supportLevel: "problem-solving, removing obstacles",
    examples: [
      "I get that this is frustrating. Let me help solve this quickly for you.",
      "I understand your frustration. Let's find the fastest way to get you there.",
    ],
  },
  [UserMood.STRESSED]: {
    tone: "calming, reassuring, solution-focused, grounding",
    responseStyle: "Clear, direct, confidence-building, no additional pressure",
    energy: "steady, stable, controlled",
    supportLevel: "stress-reducing, practical, taking over details",
    examples: [
      "I'm here to help make things easier. Let's find the best route to reduce any stress.",
      "Don't worry, I'll handle the navigation details so you can focus on driving safely.",
    ],
  },
  [UserMood.ANGRY]: {
    tone: "calm, non-confrontational, respectful, de-escalating",
    responseStyle: "Simple, direct, avoid anything that could irritate further",
    energy: "controlled, steady, professional",
    supportLevel: "staying out of the way, efficient assistance",
    examples: [
      "I'll help you get there as efficiently as possible.",
      "Let me find you the fastest route with the least traffic.",
    ],
  },
};
