import { useEffect, useRef } from "react";
import "./index.css";
import {
  sendFunctionResult,
  sendResponseCreate,
  sendSessionUpdate,
} from "./webrtc";
import { useWebRTC } from "./hooks/useWebRTC";
import { useAudio } from "./hooks/useAudio";
import { useMood } from "./hooks/useMood";
import { useUsers } from "./hooks/useUsers";
import { useLanguages } from "./hooks/useLanguages";
import { useQuota } from "./hooks/useQuota";
import { RealtimeEventHandler } from "./services/realtimeService";
import {
  StatusIndicator,
  MoodDisplay,
  UserSelector,
  LanguageSelector,
  VoiceControls,
  InfoPanel,
  QuotaIndicator,
} from "./components";

export default function App() {
  // Custom hooks
  const webRTC = useWebRTC();
  const { userDing, aiDing, controlMicrophone } = useAudio();
  const mood = useMood();
  const users = useUsers();
  const languages = useLanguages();
  const quota = useQuota();

  const audioRef = useRef(null);

  // Create event handler with dependencies
  const eventHandler = new RealtimeEventHandler({
    selectedUser: users.selectedUser,
    dcRef: webRTC.refs.dc,
    backendUrl: "http://localhost:3001",
    setCurrentMood: mood.setCurrentMood,
    setMoodConfidence: mood.setMoodConfidence,
    setIsListening: webRTC.setIsListening,
    setIsAISpeaking: webRTC.setIsAISpeaking,
    setStatus: webRTC.setStatus,
    micRef: webRTC.refs.mic,
    userDing,
    aiDing,
    sendSessionUpdate,
    sendFunctionResult,
    sendResponseCreate,
  });

  const handleStart = async () => {
    try {
      const { dc } = await webRTC.connect(
        users.selectedUser,
        eventHandler.handleEvent.bind(eventHandler),
        (stream) => {
          if (audioRef.current) {
            audioRef.current.srcObject = stream;
            audioRef.current.play().catch(console.error);
          }
        },
        (sessionInfo) => {
          // Initialize WebSocket connection for quota updates
          quota.initializeWebSocket();
          quota.updateQuotaStatus();
        }
      );

      webRTC.setupSession(
        users.selectedUser,
        users.users,
        languages.selectedLanguage,
        languages.getLanguageNativeName(languages.selectedLanguage)
      );
    } catch (error) {
      console.error("Failed to start:", error);
    }
  };

  const handleStop = () => {
    webRTC.disconnect();
    mood.clearMood();
    quota.resetSession();
  };

  // Cleanup on unmount
  useEffect(() => () => handleStop(), []);

  return (
    <div className="flex overflow-hidden relative justify-center items-center min-h-screen text-white bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      <div className="relative z-10 px-6 w-full max-w-lg text-center">
        <h1 className="mb-8 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Drival
        </h1>

        <StatusIndicator connectionStatus={webRTC.connectionStatus} />

        {webRTC.connectionStatus.isConnected && (
          <QuotaIndicator quotaStatus={quota.quotaStatus} />
        )}

        <MoodDisplay
          currentMood={mood.currentMood}
          moodConfidence={mood.moodConfidence}
          getMoodEmoji={mood.getMoodEmoji}
          getMoodColor={mood.getMoodColor}
        />

        {!webRTC.connectionStatus.isConnected && (
          <>
            <UserSelector
              users={users.users}
              selectedUser={users.selectedUser}
              onUserChange={users.setSelectedUser}
              loading={users.loading}
              error={users.error}
            />

            <LanguageSelector
              languages={languages.languages}
              selectedLanguage={languages.selectedLanguage}
              onLanguageChange={languages.setSelectedLanguage}
            />
          </>
        )}

        <VoiceControls
          connectionStatus={webRTC.connectionStatus}
          onStart={handleStart}
          onStop={handleStop}
        />

        {/* Quota Warning */}
        {quota.lastWarning && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-yellow-300 text-sm">
                ⚠️ {quota.lastWarning.message}
              </span>
              <button
                onClick={quota.clearWarning}
                className="text-yellow-300 hover:text-yellow-100 ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Session Terminated */}
        {quota.isSessionTerminated && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="text-red-300 text-sm text-center">
              🚫 Session ended: {quota.terminationReason}
            </div>
          </div>
        )}

        <InfoPanel />

        <audio ref={audioRef} autoPlay className="hidden" />
      </div>
    </div>
  );
}
