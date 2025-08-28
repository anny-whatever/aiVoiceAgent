import { useEffect, useRef, useState } from "react";
import "./index.css";
import {
  sendFunctionResult,
  sendResponseCreate,
  sendSessionUpdate,
} from "./webrtc";
import { useWebRTC } from "./hooks/useWebRTC";
import { useAudio } from "./hooks/useAudio";
import { useMood } from "./hooks/useMood";
import { useLanguages } from "./hooks/useLanguages";
import { useQuota } from "./hooks/useQuota";
import { RealtimeEventHandler } from "./services/realtimeService";
import { getRequiredURLParams } from "./utils/urlParams";
import {
  MoodDisplay,
  MoodEmoji,
  LanguageSelector,
  VoiceControls,
  InfoPanel,
} from "./components";

export default function App() {
  // Custom hooks
  const webRTC = useWebRTC();
  const { userDing, aiDing, controlMicrophone } = useAudio();
  const mood = useMood();
  const languages = useLanguages();
  const quota = useQuota();
  
  // URL params state
  const [urlParams, setUrlParams] = useState(null);
  const [paramError, setParamError] = useState(null);

  const audioRef = useRef(null);

  // Initialize URL parameters on app start
  useEffect(() => {
    try {
      const params = getRequiredURLParams();
      setUrlParams(params);
      console.log('Initialized with URL params:', { uid: params.uid, apiKey: params.apiKey ? '[REDACTED]' : null });
    } catch (error) {
      setParamError(error.message);
      console.error('URL parameter error:', error.message);
    }
  }, []);

  // Create event handler with dependencies
  const eventHandler = new RealtimeEventHandler({
    selectedUser: urlParams?.uid || 'unknown',
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
    if (!urlParams) {
      console.error('Cannot start: URL parameters not loaded');
      return;
    }
    
    try {
      const { dc } = await webRTC.connect(
        urlParams.uid,
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
          // Start the live timer countdown
          quota.startTimer();
        }
      );

      // Fetch real user data from the API
      try {
        const response = await fetch(`http://localhost:3001/api/user/${urlParams.uid}?api=${urlParams.apiKey}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user data: ${response.status}`);
        }
        
        const userData = await response.json();
        
        if (!userData.success || !userData.user) {
          throw new Error('Invalid user data received from API');
        }
        
        // Create users array with real user data
        const users = [{
          id: userData.user.id,
          name: userData.user.name || `User ${userData.user.id}`
        }];
        
        webRTC.setupSession(
          urlParams.uid,
          users,
          languages.selectedLanguage,
          languages.getLanguageNativeName(languages.selectedLanguage)
        );
      } catch (userFetchError) {
        console.error('Failed to fetch user data, falling back to mock:', userFetchError);
        // Fallback to mock users if API call fails
        const mockUsers = [{ id: urlParams.uid, name: `User ${urlParams.uid}` }];
        
        webRTC.setupSession(
          urlParams.uid,
          mockUsers,
          languages.selectedLanguage,
          languages.getLanguageNativeName(languages.selectedLanguage)
        );
      }
    } catch (error) {
      console.error("Failed to start:", error);
    }
  };

  const handleStop = () => {
    webRTC.disconnect();
    mood.clearMood();
    // Stop the timer and reset session
    quota.stopTimer();
    quota.resetSession();
  };

  // Handle automatic session termination
  useEffect(() => {
    if (quota.isSessionTerminated && webRTC.connectionStatus.isConnected) {
      console.log('Session terminated due to time limit, disconnecting...');
      handleStop();
    }
  }, [quota.isSessionTerminated, webRTC.connectionStatus.isConnected]);

  // Cleanup on unmount
  useEffect(() => () => handleStop(), []);

  return (
    <div className="flex flex-col min-h-screen text-white bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 to-red-600/5" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/10 via-transparent to-transparent" />

      {/* Top Navigation */}
      <div className="relative z-10 flex justify-between items-center p-4">
        {/* Language Selector - Top Left */}
        {!webRTC.connectionStatus.isConnected && !paramError && (
          <LanguageSelector
            languages={languages.languages}
            selectedLanguage={languages.selectedLanguage}
            onLanguageChange={languages.setSelectedLanguage}
          />
        )}
        {webRTC.connectionStatus.isConnected && <div></div>}
        
        {/* Mood + Info - Top Right */}
        <div className="flex items-center gap-3">
          <MoodEmoji
            currentMood={mood.currentMood}
            getMoodEmoji={mood.getMoodEmoji}
          />
          <InfoPanel />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center px-6">

        {/* URL Parameter Error */}
        {paramError && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="text-red-300 text-sm text-center">
              ❌ {paramError}
            </div>
          </div>
        )}

        <VoiceControls
          connectionStatus={webRTC.connectionStatus}
          onStart={handleStart}
          onStop={handleStop}
          disabled={!!paramError || !urlParams}
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

        {webRTC.connectionStatus.isConnected && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg">
            <div className="text-xs text-gray-400 text-center">
              Session Time: {Math.floor(quota.quotaStatus.remaining / 60)}:{(quota.quotaStatus.remaining % 60).toString().padStart(2, '0')}
            </div>
          </div>
        )}
      </div>

      <audio ref={audioRef} autoPlay className="hidden" />
    </div>
  );
}
