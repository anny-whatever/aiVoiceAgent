import React from "react";
import { ConnectionStatus } from "../types";

interface VoiceControlsProps {
  connectionStatus: ConnectionStatus;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  connectionStatus,
  onStart,
  onStop,
  disabled = false,
}) => {
  const { isConnected } = connectionStatus;

  const buttonBaseClass =
    "relative overflow-hidden py-4 px-8 w-full font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";

  if (isConnected) {
    return (
      <button
        onClick={onStop}
        disabled={disabled}
        className={`${buttonBaseClass} bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500/50 shadow-red-500/25`}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
              clipRule="evenodd"
            />
          </svg>
          End Session
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 transform scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100"></div>
      </button>
    );
  }

  return (
    <button
      onClick={onStart}
      disabled={disabled}
      className={`${buttonBaseClass} bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500/50 shadow-blue-500/25`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
            clipRule="evenodd"
          />
        </svg>
        Start Voice Chat
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 transform scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100"></div>
    </button>
  );
};
