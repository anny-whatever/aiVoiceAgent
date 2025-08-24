import React from "react";

interface MoodDisplayProps {
  currentMood: string | null;
  moodConfidence: number;
  getMoodEmoji: (mood: string | null) => string;
  getMoodColor: (mood: string | null) => string;
}

export const MoodDisplay: React.FC<MoodDisplayProps> = ({
  currentMood,
  moodConfidence,
  getMoodEmoji,
  getMoodColor,
}) => {
  // Always show the mood display - even if no mood detected yet
  return (
    <div className="p-4 mb-6 bg-gradient-to-r from-gray-800/80 to-gray-900/80 rounded-xl border border-gray-700/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="text-center mb-3">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Current Mood</h3>

        {currentMood ? (
          <>
            <div className="flex gap-3 justify-center items-center mb-3">
              <div className="text-3xl animate-bounce">
                {getMoodEmoji(currentMood)}
              </div>
              <div className="text-center">
                <span className="text-lg font-semibold text-gray-100 capitalize block">
                  {currentMood}
                </span>
                <span className="text-sm text-gray-400">
                  {Math.round(moodConfidence * 100)}% confidence
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden w-full h-2 bg-gray-700 rounded-full">
                <div
                  className={`h-full transition-all duration-1000 ease-out rounded-full ${getMoodColor(
                    currentMood
                  )} shadow-sm`}
                  style={{
                    width: `${moodConfidence * 100}%`,
                    boxShadow: `0 0 10px ${
                      getMoodColor(currentMood).includes("yellow")
                        ? "#fbbf24"
                        : getMoodColor(currentMood).includes("green")
                        ? "#34d399"
                        : getMoodColor(currentMood).includes("blue")
                        ? "#60a5fa"
                        : getMoodColor(currentMood).includes("purple")
                        ? "#a78bfa"
                        : getMoodColor(currentMood).includes("red")
                        ? "#f87171"
                        : "#9ca3af"
                    }40`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-400">
              Detected during conversation
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">🤔</div>
            <div className="text-gray-400 text-sm">Mood not detected yet</div>
            <div className="text-xs text-gray-500 mt-1">
              Tell me how you're feeling!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
