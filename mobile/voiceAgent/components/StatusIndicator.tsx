import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusIndicatorProps {
  status: string;
  isConnected: boolean;
  isListening: boolean;
  isAISpeaking: boolean;
}

export function StatusIndicator({ status, isConnected, isListening, isAISpeaking }: StatusIndicatorProps) {
  const getStatusColor = () => {
    if (isConnected) {
      return '#4ECDC4'; // Teal
    } else if (status === 'connecting') {
      return '#F39C12'; // Orange
    } else {
      return '#E74C3C'; // Red
    }
  };

  const getStatusText = () => {
    if (isAISpeaking) return 'AI Speaking';
    if (isListening) return 'Listening';
    
    if (isConnected) {
      return 'Connected';
    } else if (status === 'connecting') {
      return 'Connecting...';
    } else {
      return 'Disconnected';
    }
  };

  const getStatusIcon = () => {
    if (isAISpeaking) return '🤖';
    if (isListening) return '🎤';
    
    if (isConnected) {
      return '✅';
    } else if (status === 'connecting') {
      return '🔄';
    } else {
      return '❌';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
      <Text style={styles.icon}>{getStatusIcon()}</Text>
      <Text style={[styles.text, { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
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
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});