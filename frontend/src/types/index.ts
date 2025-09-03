export interface User {
  id: string;
  name: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface MoodAssessment {
  mood: "happy" | "content" | "neutral" | "tired" | "stressed";
  confidence: number;
  reasoning?: string;
  timestamp?: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isListening: boolean;
  isAISpeaking: boolean;
  status: string;
}

export interface SessionInfo {
  sessionToken: string;
  quotaRemaining: number;
  sessionTimeLimit: number;
  warningThreshold: number;
}

export interface QuotaStatus {
  remaining: number;
  total: number;
  percentage: number;
  isWarning: boolean;
  isCritical: boolean;
}

export interface WebRTCRefs {
  pc: RTCPeerConnection | null;
  dc: RTCDataChannel | null;
  mic: MediaStream | null;
}

export interface ApiResponse<T = any> {
  content?: string;
  assessment?: MoodAssessment;
  instructions?: string;
  data?: T;
}

export interface EventHandlerArgs {
  selectedUser: string;
  dcRef: React.MutableRefObject<RTCDataChannel | null>;
  backendUrl: string;
  setCurrentMood: (mood: string | null) => void;
  setMoodConfidence: (confidence: number) => void;
  setIsListening: (listening: boolean) => void;
  setIsAISpeaking: (speaking: boolean) => void;
  setStatus: (status: string) => void;
  micRef: React.MutableRefObject<MediaStream | null>;
  videoMoodRef?: React.MutableRefObject<any>;
  userDing: () => void;
  aiDing: () => void;
  sendSessionUpdate: (dc: RTCDataChannel, update: any) => void;
  sendFunctionResult: (
    dc: RTCDataChannel,
    callId: string,
    output: string
  ) => void;
  sendResponseCreate: (dc: RTCDataChannel, response?: any) => void;
}
