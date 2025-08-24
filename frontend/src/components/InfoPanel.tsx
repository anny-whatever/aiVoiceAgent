import React from "react";

interface InfoPanelProps {
  className?: string;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ className = "" }) => {
  return (
    <div className={`mt-8 ${className}`}>
      <div className="p-4 bg-gradient-to-r from-gray-800/60 to-gray-900/60 rounded-lg border border-gray-700/50 backdrop-blur-sm shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-400 text-xl">💡</span>
          <h3 className="text-sm font-semibold text-gray-200">
            Getting Started
          </h3>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          Ask about driving tips, traffic rules, or your trip history. I can
          help you analyze your driving patterns and provide personalized
          recommendations.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-xs">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Green: Listening to your voice</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Blue: AI is responding</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
          <span>Gray: Ready for conversation</span>
        </div>
      </div>
    </div>
  );
};
