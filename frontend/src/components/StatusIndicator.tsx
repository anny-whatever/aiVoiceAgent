import React from "react";
import { ConnectionStatus } from "../types";

interface StatusIndicatorProps {
  connectionStatus: ConnectionStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  connectionStatus,
}) => {
  const { isConnected, isListening, isAISpeaking, status } = connectionStatus;

  const getIndicatorClass = () => {
    if (isAISpeaking) {
      return "bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse shadow-lg shadow-blue-500/50";
    }
    if (isListening) {
      return "bg-gradient-to-r from-green-500 to-green-600 animate-pulse shadow-lg shadow-green-500/50";
    }
    if (isConnected) {
      return "bg-gradient-to-r from-gray-600 to-gray-700 shadow-lg shadow-gray-500/30";
    }
    return "bg-gradient-to-r from-gray-500 to-gray-600 shadow-lg shadow-gray-500/20";
  };

  const getIcon = () => {
    if (isAISpeaking) return "🤖";
    if (isListening) return "🎤";
    if (isConnected) return "💭";
    return "🚗";
  };

  const getOuterRing = () => {
    if (isAISpeaking) {
      return "ring-4 ring-blue-300/50 animate-ping";
    }
    if (isListening) {
      return "ring-4 ring-green-300/50 animate-ping";
    }
    return "";
  };

  return (
    <div className="mb-6">
      <div className="relative">
        <div
          className={`w-36 h-36 mx-auto rounded-full flex items-center justify-center transition-all duration-500 transform hover:scale-105 ${getIndicatorClass()}`}
        >
          <span className="text-5xl filter drop-shadow-lg">{getIcon()}</span>
        </div>
        {(isAISpeaking || isListening) && (
          <div
            className={`absolute inset-0 w-36 h-36 mx-auto rounded-full ${getOuterRing()}`}
          />
        )}
      </div>
      <div className="mt-4 min-h-[2rem] flex items-center justify-center">
        <p className="text-lg font-medium text-center px-4 py-2 bg-gray-800/50 rounded-lg backdrop-blur-sm border border-gray-700/50">
          {status}
        </p>
      </div>
    </div>
  );
};
