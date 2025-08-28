import React, { useState } from "react";

interface InfoPanelProps {
  className?: string;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center w-10 h-10 bg-black/30 rounded-full border border-gray-600/30 backdrop-blur-sm hover:bg-black/50 transition-all duration-200"
      >
        <span className="text-white text-sm font-medium">i</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700/50 p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-xl">💡</span>
                <h3 className="text-lg font-semibold text-gray-200">
                  Getting Started
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Ask about driving tips, traffic rules, or your trip history. I can
              help you analyze your driving patterns and provide personalized
              recommendations.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
