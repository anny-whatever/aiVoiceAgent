import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { QuotaStatus } from '../types';

interface QuotaIndicatorProps {
  quotaStatus: QuotaStatus;
}

export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({ quotaStatus }) => {
  const getQuotaColor = () => {
    if (quotaStatus.isCritical) return '#ef4444'; // red-500
    if (quotaStatus.isWarning) return '#f59e0b'; // yellow-500
    return '#22c55e'; // green-500
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const quotaColor = getQuotaColor();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Time</Text>
      
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, { color: quotaColor }]}>
          {formatTime(quotaStatus.remaining)}
        </Text>
        <Text style={styles.totalText}>
          / {formatTime(quotaStatus.total)}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${quotaStatus.percentage}%`,
                backgroundColor: quotaColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.percentageText, { color: quotaColor }]}>
          {Math.round(quotaStatus.percentage)}%
        </Text>
      </View>

      {quotaStatus.isWarning && (
        <Text style={styles.warningText}>
          ⚠️ Low time remaining
        </Text>
      )}

      {quotaStatus.isCritical && (
        <Text style={styles.criticalText}>
          🚫 Critical: Session will end soon
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937', // gray-800
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6', // gray-100
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  totalText: {
    fontSize: 18,
    color: '#9ca3af', // gray-400
    marginLeft: 8,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#374151', // gray-700
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    color: '#fcd34d', // yellow-300
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  criticalText: {
    color: '#fca5a5', // red-300
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});