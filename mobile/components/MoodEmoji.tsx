import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MoodEmojiProps {
  currentMood: string | null;
  getMoodEmoji: (mood: string | null) => string;
}

export const MoodEmoji: React.FC<MoodEmojiProps> = ({
  currentMood,
  getMoodEmoji,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>
        {getMoodEmoji(currentMood)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)', // gray-600/30
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
});