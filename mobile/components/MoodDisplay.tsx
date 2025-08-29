import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface MoodDisplayProps {
  currentMood: string | null;
  moodConfidence: number;
  getMoodEmoji: (mood: string | null) => string;
  getMoodColor: (mood: string | null) => string;
}

export const MoodDisplay: React.FC<MoodDisplayProps> = ({
  currentMood,
  moodConfidence,
  getMoodEmoji,
  getMoodColor,
}) => {
  const bounceAnim = React.useRef(new Animated.Value(1)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (currentMood) {
      // Bounce animation for emoji
      const bounce = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      bounce.start();

      // Progress bar animation
      Animated.timing(progressAnim, {
        toValue: moodConfidence,
        duration: 1000,
        useNativeDriver: false,
      }).start();

      return () => bounce.stop();
    }
  }, [currentMood, moodConfidence, bounceAnim, progressAnim]);

  const getMoodColorHex = (mood: string | null): string => {
    switch (mood) {
      case 'ecstatic':
        return '#fbbf24'; // yellow-400
      case 'excited':
      case 'happy':
        return '#34d399'; // green-400
      case 'content':
        return '#86efac'; // green-300
      case 'neutral':
        return '#60a5fa'; // blue-400
      case 'calm':
        return '#93c5fd'; // blue-300
      case 'tired':
        return '#a78bfa'; // purple-400
      case 'sad':
        return '#9ca3af'; // gray-400
      case 'frustrated':
        return '#fb923c'; // orange-400
      case 'stressed':
        return '#fca5a5'; // red-300
      case 'angry':
        return '#f87171'; // red-400
      default:
        return '#9ca3af'; // gray-400
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Current Mood</Text>
      </View>

      {currentMood ? (
        <>
          <View style={styles.moodInfo}>
            <Animated.Text
              style={[
                styles.emoji,
                {
                  transform: [{ scale: bounceAnim }],
                },
              ]}
            >
              {getMoodEmoji(currentMood)}
            </Animated.Text>
            <View style={styles.moodDetails}>
              <Text style={styles.moodName}>{currentMood}</Text>
              <Text style={styles.confidence}>
                {Math.round(moodConfidence * 100)}% confidence
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: getMoodColorHex(currentMood),
                  },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>Low</Text>
              <Text style={styles.progressLabel}>High</Text>
            </View>
          </View>

          <Text style={styles.detectedText}>Detected during conversation</Text>
        </>
      ) : (
        <View style={styles.noMoodContainer}>
          <Text style={styles.noMoodEmoji}>🤔</Text>
          <Text style={styles.noMoodText}>Mood not detected yet</Text>
          <Text style={styles.noMoodSubtext}>Tell me how you're feeling!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(31, 41, 55, 0.8)', // gray-800/80
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)', // gray-700/50
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d1d5db', // gray-300
    marginBottom: 8,
  },
  moodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 32,
  },
  moodDetails: {
    alignItems: 'center',
  },
  moodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6', // gray-100
    textTransform: 'capitalize',
  },
  confidence: {
    fontSize: 14,
    color: '#9ca3af', // gray-400
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151', // gray-700
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280', // gray-500
  },
  detectedText: {
    fontSize: 12,
    color: '#9ca3af', // gray-400
    textAlign: 'center',
  },
  noMoodContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noMoodEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  noMoodText: {
    fontSize: 14,
    color: '#9ca3af', // gray-400
    marginBottom: 4,
  },
  noMoodSubtext: {
    fontSize: 12,
    color: '#6b7280', // gray-500
  },
});