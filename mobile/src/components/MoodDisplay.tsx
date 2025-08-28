import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MoodDisplayProps {
  currentMood: string;
  moodConfidence: number;
  getMoodEmoji: (mood: string) => string;
  getMoodColor: (mood: string) => string;
}

export const MoodDisplay: React.FC<MoodDisplayProps> = ({
  currentMood,
  moodConfidence,
  getMoodEmoji,
  getMoodColor,
}) => {
  const moodColor = getMoodColor(currentMood);
  const confidencePercentage = Math.round(moodConfidence * 100);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Current Mood</Text>
      
      <View style={styles.moodContainer}>
        <Text style={styles.emoji}>{getMoodEmoji(currentMood)}</Text>
        <Text style={[styles.moodText, { color: moodColor }]}>
          {currentMood || 'Unknown'}
        </Text>
      </View>

      {moodConfidence > 0 && (
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>
            Confidence: {confidencePercentage}%
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${confidencePercentage}%`,
                  backgroundColor: moodColor,
                },
              ]}
            />
          </View>
        </View>
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
  moodContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  moodText: {
    fontSize: 20,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  confidenceContainer: {
    width: '100%',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#9ca3af', // gray-400
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#374151', // gray-700
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});