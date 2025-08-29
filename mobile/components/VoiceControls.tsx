import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConnectionStatus } from '../types';

interface VoiceControlsProps {
  connectionStatus: ConnectionStatus;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  connectionStatus,
  onStart,
  onStop,
  disabled = false,
}) => {
  const { isConnected } = connectionStatus;

  return (
    <View style={styles.container}>
      {!isConnected ? (
        <TouchableOpacity
          onPress={onStart}
          disabled={disabled}
          style={[
            styles.button,
            styles.startButton,
            disabled && styles.disabledButton,
          ]}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="mic" size={32} color="white" />
            <Text style={styles.buttonText}>START</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onStop}
          disabled={disabled}
          style={[
            styles.button,
            styles.stopButton,
            disabled && styles.disabledButton,
          ]}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="close" size={32} color="white" />
            <Text style={styles.buttonText}>STOP</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  startButton: {
    backgroundColor: '#ea580c', // orange-600
  },
  stopButton: {
    backgroundColor: '#dc2626', // red-600
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonContent: {
    alignItems: 'center',
    gap: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});