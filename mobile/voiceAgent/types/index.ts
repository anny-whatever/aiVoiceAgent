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
  mood: "energetic" | "content" | "neutral" | "tired" | "stressed";
  confidence: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isListening: boolean;
  isAISpeaking: boolean;
  status: string;
}

// React Native WebRTC specific types
export interface WebRTCRefs {
  pc: any; // RTCPeerConnection from react-native-webrtc
  dc: any; // RTCDataChannel from react-native-webrtc
  mic: any; // MediaStream from react-native-webrtc
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
  sendFunctionResult: (dc: any, callId: string, output: string) => void;
  sendResponseCreate: (dc: any, response?: any) => void;
}

// Mobile-specific types
export interface AudioPermissions {
  granted: boolean;
  canAskAgain: boolean;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  version: string;
}

export interface VoiceControlsProps {
  connectionStatus: ConnectionStatus;
  onStart: () => void;
  onStop: () => void;
}

export interface StatusIndicatorProps {
  status: string;
  isConnected: boolean;
  isListening: boolean;
  isAISpeaking: boolean;
}

export interface MoodDisplayProps {
  mood: string | null;
  confidence: number;
}

export interface UserSelectorProps {
  users: User[];
  selectedUser: string;
  onUserChange: (userId: string) => void;
}

export interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
}