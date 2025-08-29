import { useState, useEffect, useCallback, useRef } from 'react';
import { QuotaStatus } from '../types';
import ApiService from '../services/api';

// Simplified QuotaWarning interface for React Native
interface QuotaWarning {
  type: 'warning' | 'critical';
  message: string;
  remaining: number;
}

export const useQuota = () => {
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus>({
    remaining: 0,
    total: 0,
    percentage: 0,
    isWarning: false,
    isCritical: false,
  });
  const [lastWarning, setLastWarning] = useState<QuotaWarning | null>(null);
  const [isSessionTerminated, setIsSessionTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateQuotaStatus = useCallback(() => {
    const sessionManager = ApiService.getSessionManager();
    const status = sessionManager.getQuota();
    setQuotaStatus(status);
    
    // Check if session should be terminated due to quota exhaustion
    if (status.remaining <= 0 && isTimerActive) {
      setIsSessionTerminated(true);
      setTerminationReason('Session quota exhausted');
      setIsTimerActive(false);
      sessionManager.clearSession();
    }
    
    // Check for warnings
    if (status.isWarning && !lastWarning) {
      setLastWarning({
        type: 'warning',
        message: 'Quota running low',
        remaining: status.remaining,
      });
      // Auto-clear warning after 5 seconds
      setTimeout(() => setLastWarning(null), 5000);
    }
    
    if (status.isCritical && (!lastWarning || lastWarning.type !== 'critical')) {
      setLastWarning({
        type: 'critical',
        message: 'Quota critically low',
        remaining: status.remaining,
      });
      // Auto-clear warning after 5 seconds
      setTimeout(() => setLastWarning(null), 5000);
    }
  }, [isTimerActive, lastWarning]);

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsTimerActive(true);
    
    // Update the display every second
    // The backend heartbeat system handles the actual time tracking
    timerRef.current = setInterval(() => {
      updateQuotaStatus();
    }, 1000);
  }, [updateQuotaStatus]);
  
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerActive(false);
  }, []);

  const clearWarning = useCallback(() => {
    setLastWarning(null);
  }, []);

  const resetSession = useCallback(() => {
    setIsSessionTerminated(false);
    setTerminationReason(null);
    setLastWarning(null);
    stopTimer();
    ApiService.getSessionManager().clearSession();
    updateQuotaStatus();
  }, [updateQuotaStatus, stopTimer]);

  // Simulate websocket functionality with periodic updates
  const initializeQuotaTracking = useCallback(() => {
    // For React Native, we'll rely on the heartbeat service and periodic updates
    // instead of websockets for now
    updateQuotaStatus();
  }, [updateQuotaStatus]);

  useEffect(() => {
    // Initial quota status update
    updateQuotaStatus();
    
    // Initialize quota tracking if we have a session token
    const sessionToken = ApiService.getSessionManager().getSessionToken();
    if (sessionToken) {
      initializeQuotaTracking();
    }

    // Cleanup on unmount
    return () => {
      stopTimer();
    };
  }, [updateQuotaStatus, initializeQuotaTracking, stopTimer]);

  return {
    quotaStatus,
    lastWarning,
    isSessionTerminated,
    terminationReason,
    isTimerActive,
    updateQuotaStatus,
    initializeQuotaTracking,
    startTimer,
    stopTimer,
    clearWarning,
    resetSession,
  };
};