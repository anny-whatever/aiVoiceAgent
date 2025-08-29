import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { QuotaStatus } from '../types';

interface QuotaIndicatorProps {
  quotaStatus: QuotaStatus;
}

export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({
  quotaStatus,
}) => {
  const { remaining, total, percentage, isWarning, isCritical } = quotaStatus;

  const getBarColor = () => {
    if (isCritical) return '#ef4444'; // red-500
    if (isWarning) return '#eab308'; // yellow-500
    return '#10b981'; // green-500
  };

  const getTextColor = () => {
    if (isCritical) return '#dc2626'; // red-600
    if (isWarning) return '#d97706'; // yellow-600
    return '#059669'; // green-600
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Session Time Remaining</Text>
        <Text style={[styles.timeText, { color: getTextColor() }]}>
          {formatTime(remaining)} / {formatTime(total)}
        </Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.max(0, percentage)}%`,
              backgroundColor: getBarColor(),
            },
          ]}
        />
      </View>
      
      {isCritical && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.criticalText}>Session ending soon!</Text>
        </View>
      )}
      
      {isWarning && !isCritical && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningIcon}>⏰</Text>
          <Text style={styles.warningText}>Session time running low</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  timeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#374151', // gray-700
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warningIcon: {
    fontSize: 12,
  },
  criticalText: {
    fontSize: 12,
    color: '#fca5a5', // red-300
  },
  warningText: {
    fontSize: 12,
    color: '#fcd34d', // yellow-300
  },
});