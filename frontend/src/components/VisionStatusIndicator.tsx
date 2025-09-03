import React from 'react';

interface VisionStatusIndicatorProps {
  isListening: boolean;
  isCapturing: boolean;
  isAnalyzing: boolean;
  lastAnalysisTime?: Date;
  onToggleListening?: () => void;
  onShowLastAnalysis?: () => void;
}

export const VisionStatusIndicator: React.FC<VisionStatusIndicatorProps> = ({
  isListening,
  isCapturing,
  isAnalyzing,
  lastAnalysisTime,
  onToggleListening,
  onShowLastAnalysis
}) => {
  const getStatusText = () => {
    if (isAnalyzing) return 'Analyzing...';
    if (isCapturing) return 'Capturing...';
    if (isListening) return 'Listening for vision keywords';
    return 'Vision capture disabled';
  };

  const getStatusIcon = () => {
    if (isAnalyzing) return '🔍';
    if (isCapturing) return '📸';
    if (isListening) return '👁️';
    return '👁️‍🗨️';
  };

  const getStatusColor = () => {
    if (isAnalyzing) return 'text-blue-400';
    if (isCapturing) return 'text-yellow-400';
    if (isListening) return 'text-green-400';
    return 'text-gray-500';
  };

  const getBorderColor = () => {
    if (isAnalyzing) return 'border-blue-500/50';
    if (isCapturing) return 'border-yellow-500/50';
    if (isListening) return 'border-green-500/50';
    return 'border-gray-600/50';
  };

  return (
    <div className={`p-3 bg-gradient-to-r from-gray-800/80 to-gray-900/80 rounded-lg border ${getBorderColor()} backdrop-blur-sm shadow-lg transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`text-lg ${getStatusColor()}`}>
            {getStatusIcon()}
          </div>
          <div>
            <div className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            {lastAnalysisTime && (
              <div className="text-xs text-gray-500">
                Last: {lastAnalysisTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {lastAnalysisTime && onShowLastAnalysis && (
            <button
              onClick={onShowLastAnalysis}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              title="Show last analysis"
            >
              View
            </button>
          )}
          
          {onToggleListening && (
            <button
              onClick={onToggleListening}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                isListening
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={isListening ? 'Disable vision capture' : 'Enable vision capture'}
            >
              {isListening ? 'ON' : 'OFF'}
            </button>
          )}
        </div>
      </div>
      
      {/* Activity indicator */}
      {(isCapturing || isAnalyzing) && (
        <div className="mt-2">
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div className={`h-1 rounded-full animate-pulse ${
              isAnalyzing ? 'bg-blue-500' : 'bg-yellow-500'
            }`} style={{ width: '100%' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisionStatusIndicator;