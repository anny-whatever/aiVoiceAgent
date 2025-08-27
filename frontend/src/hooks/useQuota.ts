import { useState, useEffect, useCallback } from "react";
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

  const updateQuotaStatus = useCallback(() => {
    const sessionManager = ApiService.getSessionManager();
    const status = sessionManager.getQuotaStatus();
    setQuotaStatus(status);
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
        ApiService.getSessionManager().clearSession();
        updateQuotaStatus();
      },
    });
  }, [updateQuotaStatus]);

  const clearWarning = useCallback(() => {
    setLastWarning(null);
  }, []);

  const resetSession = useCallback(() => {
    setIsSessionTerminated(false);
    setTerminationReason(null);
    setLastWarning(null);
    ApiService.getSessionManager().clearSession();
    updateQuotaStatus();
  }, [updateQuotaStatus]);

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
      websocketService.disconnect();
    };
  }, [updateQuotaStatus, initializeWebSocket]);

  return {
    quotaStatus,
    lastWarning,
    isSessionTerminated,
    terminationReason,
    updateQuotaStatus,
    initializeWebSocket,
    clearWarning,
    resetSession,
  };
};