import { useState, useEffect, useCallback, useRef } from "react";
import { QuotaStatus } from "../types";
import { ApiService } from "../services/api";
import { websocketService, QuotaWarning } from "../services/websocket";

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
  const timerRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  const updateQuotaStatus = useCallback(() => {
    const sessionManager = ApiService.getSessionManager();
    const status = sessionManager.getQuotaStatus();
    setQuotaStatus(status);
    
    // Check if session should be terminated due to time exhaustion
    if (status.remaining <= 0 && isTimerActive) {
      setIsSessionTerminated(true);
      setTerminationReason('Session time exhausted');
      setIsTimerActive(false);
      sessionManager.clearSession();
    }
  }, [isTimerActive]);

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsTimerActive(true);
    lastUpdateRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastUpdateRef.current) / 1000);
      
      if (elapsed >= 1) {
        const sessionManager = ApiService.getSessionManager();
        const currentStatus = sessionManager.getQuotaStatus();
        const newRemaining = Math.max(0, currentStatus.remaining - elapsed);
        
        // Update the session manager with new remaining time
        sessionManager.updateQuota(newRemaining);
        
        // Update our local state
        updateQuotaStatus();
        
        lastUpdateRef.current = now;
      }
    }, 1000);
  }, [updateQuotaStatus]);
  
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerActive(false);
  }, []);

  const initializeWebSocket = useCallback(() => {
    websocketService.connect({
      onQuotaUpdate: (remaining: number) => {
        updateQuotaStatus();
      },
      onQuotaWarning: (warning: QuotaWarning) => {
        setLastWarning(warning);
        // Auto-clear warning after 5 seconds
        setTimeout(() => setLastWarning(null), 5000);
      },
      onSessionTerminated: (reason: string) => {
        setIsSessionTerminated(true);
        setTerminationReason(reason);
        stopTimer();
        ApiService.getSessionManager().clearSession();
        updateQuotaStatus();
      },
    });
  }, [updateQuotaStatus, stopTimer]);

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

  useEffect(() => {
    // Initial quota status update
    updateQuotaStatus();
    
    // Initialize WebSocket connection if we have a session token
    const sessionToken = ApiService.getSessionManager().getSessionToken();
    if (sessionToken) {
      initializeWebSocket();
    }

    // Cleanup on unmount
    return () => {
      stopTimer();
      websocketService.disconnect();
    };
  }, [updateQuotaStatus, initializeWebSocket, stopTimer]);

  return {
    quotaStatus,
    lastWarning,
    isSessionTerminated,
    terminationReason,
    isTimerActive,
    updateQuotaStatus,
    initializeWebSocket,
    startTimer,
    stopTimer,
    clearWarning,
    resetSession,
  };
};