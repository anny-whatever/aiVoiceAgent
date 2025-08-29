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
  pc: any; // RTCPeerConnection from react-native-webrtc-web-shim
  dc: any; // RTCDataChannel from react-native-webrtc-web-shim
  mic: any; // MediaStream from react-native-webrtc-web-shim
}

export interface ApiResponse<T = any> {
  content?: string;
  assessment?: MoodAssessment;
  instructions?: string;
  data?: T;
}

export interface EventHandlerArgs {
  selectedUser: string;
  dcRef: React.MutableRefObject<any>;
  backendUrl: string;
  setCurrentMood: (mood: string | null) => void;
  setMoodConfidence: (confidence: number) => void;
  setIsListening: (listening: boolean) => void;
  setIsAISpeaking: (speaking: boolean) => void;
  setStatus: (status: string) => void;
  micRef: React.MutableRefObject<any>;
  userDing: () => void;
  aiDing: () => void;
  sendSessionUpdate: (dc: any, update: any) => void;
  sendFunctionResult: (
    dc: any,
    callId: string,
    output: string
  ) => void;
  sendResponseCreate: (dc: any, response?: any) => void;
}