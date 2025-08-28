import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ConnectionStatus } from '../types';

interface StatusIndicatorProps {
  connectionStatus: ConnectionStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ connectionStatus }) => {
  const getStatusColor = () => {
    if (connectionStatus.isAISpeaking) return '#ef4444'; // red-500
    if (connectionStatus.isListening) return '#22c55e'; // green-500
    if (connectionStatus.isConnected) return '#3b82f6'; // blue-500
    return '#6b7280'; // gray-500
  };

  const getStatusText = () => {
    if (connectionStatus.isAISpeaking) return 'AI Speaking';
    if (connectionStatus.isListening) return 'Listening';
    if (connectionStatus.isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (connectionStatus.isAISpeaking) return '🤖';
    if (connectionStatus.isListening) return '🎤';
    if (connectionStatus.isConnected) return '🔗';
    return '⚫';
  };

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
      </View>
      <Text style={[styles.text, { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  indicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 32,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});