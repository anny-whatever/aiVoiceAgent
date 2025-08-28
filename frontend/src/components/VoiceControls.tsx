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

  return (
    <div className="flex justify-center">
      {!isConnected ? (
        <button
          onClick={onStart}
          disabled={disabled}
          className="w-32 h-32 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-full shadow-2xl hover:shadow-orange-500/25 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center backdrop-blur-sm border-2 border-orange-400/30"
        >
          <div className="flex flex-col items-center gap-1">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <span className="text-sm">START</span>
          </div>
        </button>
      ) : (
        <button
          onClick={onStop}
          disabled={disabled}
          className="w-32 h-32 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-full shadow-2xl hover:shadow-red-500/25 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center backdrop-blur-sm border-2 border-red-400/30"
        >
          <div className="flex flex-col items-center gap-1">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span className="text-sm">STOP</span>
          </div>
        </button>
      )}
    </div>
  );
};
