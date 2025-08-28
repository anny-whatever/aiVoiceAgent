import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ConnectionStatus } from '../types';

interface VoiceControlsProps {
  connectionStatus: ConnectionStatus;
  onStart: () => void;
  onStop: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  connectionStatus,
  onStart,
  onStop,
}) => {
  const isConnected = connectionStatus.isConnected;

  return (
    <View style={styles.container}>
      {!isConnected ? (
        <TouchableOpacity
          style={[styles.button, styles.startButton]}
          onPress={onStart}
        >
          <Text style={styles.startButtonText}>🎤 Start Voice Chat</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={onStop}
        >
          <Text style={styles.stopButtonText}>🛑 End Session</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
    width: '100%',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#22c55e', // green-500
  },
  stopButton: {
    backgroundColor: '#ef4444', // red-500
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});