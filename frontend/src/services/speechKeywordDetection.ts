/**
 * Speech Keyword Detection Service
 * Monitors speech transcripts for vision-related keywords and triggers camera capture
 */

export interface KeywordMatch {
  keyword: string;
  confidence: number;
  context: string;
  timestamp: number;
}

export interface KeywordDetectionConfig {
  keywords: string[];
  minConfidence: number;
  contextWindow: number; // Number of words around the keyword to capture
}

export class SpeechKeywordDetector {
  private config: KeywordDetectionConfig;
  private onKeywordDetected: (match: KeywordMatch) => void;
  private recentTranscripts: string[] = [];
  private maxTranscriptHistory = 10;

  constructor(
    config: KeywordDetectionConfig,
    onKeywordDetected: (match: KeywordMatch) => void
  ) {
    this.config = config;
    this.onKeywordDetected = onKeywordDetected;
  }

  /**
   * Process incoming speech transcript for keyword detection
   */
  processTranscript(transcript: string): KeywordMatch[] {
    if (!transcript || transcript.trim().length === 0) {
      return [];
    }

    // Store transcript for context
    this.recentTranscripts.push(transcript);
    if (this.recentTranscripts.length > this.maxTranscriptHistory) {
      this.recentTranscripts.shift();
    }

    const matches: KeywordMatch[] = [];
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    // Check each keyword
    for (const keyword of this.config.keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      
      if (normalizedTranscript.includes(normalizedKeyword)) {
        const confidence = this.calculateConfidence(normalizedTranscript, normalizedKeyword);
        
        if (confidence >= this.config.minConfidence) {
          const context = this.extractContext(normalizedTranscript, normalizedKeyword);
          
          const match: KeywordMatch = {
            keyword,
            confidence,
            context,
            timestamp: Date.now()
          };
          
          matches.push(match);
          
          // Trigger callback
          this.onKeywordDetected(match);
          
          console.log('🎯 Vision keyword detected:', {
            keyword,
            confidence: Math.round(confidence * 100) + '%',
            context,
            transcript: transcript.substring(0, 100)
          });
        }
      }
    }
    
    return matches;
  }

  /**
   * Calculate confidence score for keyword match
   */
  private calculateConfidence(transcript: string, keyword: string): number {
    const words = transcript.split(/\s+/);
    const keywordWords = keyword.split(/\s+/);
    
    // Base confidence for exact match
    let confidence = 0.8;
    
    // Boost confidence for exact phrase match
    if (transcript.includes(keyword)) {
      confidence += 0.15;
    }
    
    // Boost confidence if keyword appears at start or end of sentence
    if (transcript.startsWith(keyword) || transcript.endsWith(keyword)) {
      confidence += 0.05;
    }
    
    // Reduce confidence for very long transcripts (less focused)
    if (words.length > 20) {
      confidence -= 0.1;
    }
    
    // Boost confidence for short, focused statements
    if (words.length <= 5) {
      confidence += 0.1;
    }
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Extract context around the keyword
   */
  private extractContext(transcript: string, keyword: string): string {
    const words = transcript.split(/\s+/);
    const keywordIndex = words.findIndex(word => 
      word.toLowerCase().includes(keyword.split(' ')[0])
    );
    
    if (keywordIndex === -1) {
      return transcript;
    }
    
    const start = Math.max(0, keywordIndex - this.config.contextWindow);
    const end = Math.min(words.length, keywordIndex + this.config.contextWindow + 1);
    
    return words.slice(start, end).join(' ');
  }

  /**
   * Update keyword configuration
   */
  updateConfig(config: Partial<KeywordDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get recent transcript history for debugging
   */
  getRecentTranscripts(): string[] {
    return [...this.recentTranscripts];
  }

  /**
   * Clear transcript history
   */
  clearHistory(): void {
    this.recentTranscripts = [];
  }
}

/**
 * Default configuration for vision-related keywords
 */
export const DEFAULT_VISION_KEYWORDS: KeywordDetectionConfig = {
  keywords: [
    'can you see',
    'look at this',
    'what do you see',
    'take a look',
    'check this out',
    'look at that',
    'do you see',
    'what is this',
    'identify this',
    'analyze this',
    'describe this',
    'what am i looking at',
    'tell me about this',
    'what is in front of me',
    'capture this',
    'take a picture',
    'show you something',
    'vision',
    'camera',
    'photo',
    'picture',
    'image'
  ],
  minConfidence: 0.7,
  contextWindow: 3
};

/**
 * Create a speech keyword detector with default vision keywords
 */
export function createVisionKeywordDetector(
  onKeywordDetected: (match: KeywordMatch) => void,
  customConfig?: Partial<KeywordDetectionConfig>
): SpeechKeywordDetector {
  const config = { ...DEFAULT_VISION_KEYWORDS, ...customConfig };
  return new SpeechKeywordDetector(config, onKeywordDetected);
}