import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MoodDisplayProps {
  mood: string | null;
  confidence: number;
}

export function MoodDisplay({ mood, confidence }: MoodDisplayProps) {
  const getMoodColor = (mood: string | null): string => {
    switch (mood) {
      case 'energetic':
        return '#FF6B6B'; // Red
      case 'content':
        return '#4ECDC4'; // Teal
      case 'neutral':
        return '#95A5A6'; // Gray
      case 'tired':
        return '#3498DB'; // Blue
      case 'stressed':
        return '#F39C12'; // Orange
      default:
        return '#BDC3C7'; // Light gray
    }
  };

  const getMoodEmoji = (mood: string | null): string => {
    switch (mood) {
      case 'energetic':
        return '⚡';
      case 'content':
        return '😊';
      case 'neutral':
        return '😐';
      case 'tired':
        return '😴';
      case 'stressed':
        return '😰';
      default:
        return '❓';
    }
  };

  const getMoodText = (mood: string | null): string => {
    if (!mood) return 'Unknown';
    return mood.charAt(0).toUpperCase() + mood.slice(1);
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence === 0) return '';
    return `${Math.round(confidence * 100)}% confident`;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#27AE60'; // Green
    if (confidence >= 0.6) return '#F39C12'; // Orange
    if (confidence >= 0.4) return '#E67E22'; // Dark orange
    return '#E74C3C'; // Red
  };

  if (!mood) {
    return (
      <View style={styles.container}>
        <View style={[styles.moodIndicator, { backgroundColor: getMoodColor(null) }]}>
          <Text style={styles.emoji}>{getMoodEmoji(null)}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.moodText, { color: getMoodColor(null) }]}>
            No mood detected
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.moodIndicator, { backgroundColor: getMoodColor(mood) }]}>
        <Text style={styles.emoji}>{getMoodEmoji(mood)}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.moodText, { color: getMoodColor(mood) }]}>
          {getMoodText(mood)}
        </Text>
        {confidence > 0 && (
          <Text style={[styles.confidenceText, { color: getConfidenceColor(confidence) }]}>
            {getConfidenceText(confidence)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  moodIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emoji: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  moodText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '500',
  },
});