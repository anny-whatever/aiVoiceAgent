import React from "react";

interface MoodEmojiProps {
  currentMood: string | null;
  getMoodEmoji: (mood: string | null) => string;
}

export const MoodEmoji: React.FC<MoodEmojiProps> = ({
  currentMood,
  getMoodEmoji,
}) => {
  return (
    <div className="flex items-center justify-center w-10 h-10 bg-black/30 rounded-full border border-gray-600/30 backdrop-blur-sm">
      <span className="text-xl">
        {getMoodEmoji(currentMood)}
      </span>
    </div>
  );
};