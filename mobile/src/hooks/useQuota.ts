import { useState, useEffect, useCallback } from 'react';
import { QuotaStatus } from '../types';
import { ApiService } from '../services/api';

const WARNING_THRESHOLD = 20; // 20% remaining
const CRITICAL_THRESHOLD = 10; // 10% remaining

export const useQuota = () => {
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus>({
    remaining: 100,
    total: 100,
    percentage: 100,
    isWarning: false,
    isCritical: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateQuotaStatus = useCallback((remaining: number, total: number): QuotaStatus => {
    const percentage = total > 0 ? Math.round((remaining / total) * 100) : 0;
    const isWarning = percentage <= WARNING_THRESHOLD && percentage > CRITICAL_THRESHOLD;
    const isCritical = percentage <= CRITICAL_THRESHOLD;

    return {
      remaining,
      total,
      percentage,
      isWarning,
      isCritical,
    };
  }, []);

  const fetchQuotaStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const sessionManager = ApiService.getSessionManager();
      const quota = sessionManager.getQuotaStatus();
      
      if (quota) {
        setQuotaStatus(quota);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quota status';
      setError(errorMessage);
      console.error('Error fetching quota status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [calculateQuotaStatus]);

  const updateQuota = useCallback((remaining: number, total?: number) => {
    const currentTotal = total || quotaStatus.total;
    const status = calculateQuotaStatus(remaining, currentTotal);
    setQuotaStatus(status);
  }, [quotaStatus.total, calculateQuotaStatus]);

  const decrementQuota = useCallback((amount: number = 1) => {
    const newRemaining = Math.max(0, quotaStatus.remaining - amount);
    updateQuota(newRemaining);
  }, [quotaStatus.remaining, updateQuota]);

  const resetQuota = useCallback((total: number = 100) => {
    const status = calculateQuotaStatus(total, total);
    setQuotaStatus(status);
  }, [calculateQuotaStatus]);

  const getQuotaColor = useCallback(() => {
    if (quotaStatus.isCritical) return '#ef4444'; // red
    if (quotaStatus.isWarning) return '#f59e0b'; // amber
    return '#10b981'; // green
  }, [quotaStatus.isCritical, quotaStatus.isWarning]);

  const getQuotaMessage = useCallback(() => {
    if (quotaStatus.isCritical) {
      return 'Critical: Very low quota remaining';
    }
    if (quotaStatus.isWarning) {
      return 'Warning: Low quota remaining';
    }
    return 'Quota status normal';
  }, [quotaStatus.isCritical, quotaStatus.isWarning]);

  // Auto-fetch quota status on mount
  useEffect(() => {
    fetchQuotaStatus();
  }, [fetchQuotaStatus]);

  return {
    quotaStatus,
    isLoading,
    error,
    fetchQuotaStatus,
    updateQuota,
    decrementQuota,
    resetQuota,
    getQuotaColor,
    getQuotaMessage,
  };
};