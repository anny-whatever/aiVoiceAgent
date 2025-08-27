import React from "react";
import { QuotaStatus } from "../types";

interface QuotaIndicatorProps {
  quotaStatus: QuotaStatus;
}

export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({
  quotaStatus,
}) => {
  const { remaining, total, percentage, isWarning, isCritical } = quotaStatus;

  const getBarColor = () => {
    if (isCritical) return "bg-red-500";
    if (isWarning) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTextColor = () => {
    if (isCritical) return "text-red-600";
    if (isWarning) return "text-yellow-600";
    return "text-green-600";
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white/80">Session Time Remaining</span>
        <span className={`text-sm font-bold ${getTextColor()}`}>
          {formatTime(remaining)} / {formatTime(total)}
        </span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${Math.max(0, percentage)}%` }}
        ></div>
      </div>
      
      {isCritical && (
        <div className="flex items-center text-red-400 text-xs">
          <span className="mr-1">⚠️</span>
          <span>Session ending soon!</span>
        </div>
      )}
      
      {isWarning && !isCritical && (
        <div className="flex items-center text-yellow-400 text-xs">
          <span className="mr-1">⏰</span>
          <span>Session time running low</span>
        </div>
      )}
    </div>
  );
};