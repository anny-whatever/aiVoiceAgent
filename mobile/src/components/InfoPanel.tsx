import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const InfoPanel: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status Legend</Text>
      
      <View style={styles.legendItem}>
        <View style={[styles.indicator, { backgroundColor: '#6b7280' }]} />
        <Text style={styles.legendText}>⚫ Disconnected - Ready to start</Text>
      </View>
      
      <View style={styles.legendItem}>
        <View style={[styles.indicator, { backgroundColor: '#3b82f6' }]} />
        <Text style={styles.legendText}>🔗 Connected - Session active</Text>
      </View>
      
      <View style={styles.legendItem}>
        <View style={[styles.indicator, { backgroundColor: '#22c55e' }]} />
        <Text style={styles.legendText}>🎤 Listening - Speak now</Text>
      </View>
      
      <View style={styles.legendItem}>
        <View style={[styles.indicator, { backgroundColor: '#ef4444' }]} />
        <Text style={styles.legendText}>🤖 AI Speaking - Please wait</Text>
      </View>
      
      <Text style={styles.description}>
        Drival is your AI driving companion that monitors your mood and provides personalized assistance during your journey.
      </Text>
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
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6', // gray-100
    marginBottom: 16,
    textAlign: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    color: '#d1d5db', // gray-300
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#9ca3af', // gray-400
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
});