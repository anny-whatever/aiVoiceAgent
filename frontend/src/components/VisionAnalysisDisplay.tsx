import React from 'react';

interface VisionAnalysisDisplayProps {
  isVisible: boolean;
  capturedImage?: string;
  analysisResult?: string;
  isAnalyzing: boolean;
  onClose: () => void;
}

export const VisionAnalysisDisplay: React.FC<VisionAnalysisDisplayProps> = ({
  isVisible,
  capturedImage,
  analysisResult,
  isAnalyzing,
  onClose
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-r from-gray-800/95 to-gray-900/95 rounded-xl border border-gray-700/50 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <span className="text-xl">👁️</span>
            Vision Analysis
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-700/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[calc(90vh-80px)] overflow-y-auto">
          {/* Captured Image */}
          {capturedImage && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300">Captured Image</h4>
              <div className="relative rounded-lg overflow-hidden bg-gray-800/50">
                <img
                  src={capturedImage}
                  alt="Captured for analysis"
                  className="w-full h-auto max-h-64 object-contain"
                />
              </div>
            </div>
          )}

          {/* Analysis Result */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <span className="text-sm">🔍</span>
              Analysis Result
            </h4>
            
            {isAnalyzing ? (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                  <span className="text-gray-300 text-sm">Analyzing image...</span>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {analysisResult}
                </p>
              </div>
            ) : (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                <p className="text-gray-400 text-sm italic">
                  No analysis result available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700/50 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              💡 Say "can you see" or "look at this" to trigger vision analysis
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionAnalysisDisplay;