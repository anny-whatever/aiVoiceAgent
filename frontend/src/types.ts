import { VideoMoodDetectionRef } from './components/VideoMoodDetection';

export interface EventHandlerArgs {
  selectedUser: string;
  dcRef: React.RefObject<RTCDataChannel | null>;
  backendUrl: string;
  setCurrentMood: (mood: string) => void;
  setMoodConfidence: (confidence: number) => void;
  setIsListening: (listening: boolean) => void;
  setIsAISpeaking: (speaking: boolean) => void;
  setStatus: (status: string) => void;
  micRef: React.RefObject<MediaStream | null>;
  userDing: () => void;
  aiDing: () => void;
  sendSessionUpdate: (dc: RTCDataChannel, update: any) => void;
  sendFunctionResult: (dc: RTCDataChannel, callId: string, result: string) => void;
  sendResponseCreate: (dc: RTCDataChannel, response?: any) => void;
  videoMoodRef?: React.RefObject<VideoMoodDetectionRef>;
}