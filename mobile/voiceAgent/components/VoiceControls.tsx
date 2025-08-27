import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';

interface VoiceControlsProps {
  isConnected: boolean;
  isConnecting: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceControls({ isConnected, isConnecting, onStart, onStop }: VoiceControlsProps) {
  const handleStart = () => {
    Vibration.vibrate(50); // Haptic feedback
    onStart();
  };

  const handleStop = () => {
    Vibration.vibrate([50, 50, 50]); // Different vibration pattern for stop
    onStop();
  };

  const getButtonColor = () => {
    if (isConnected) return '#E74C3C'; // Red for stop
    if (isConnecting) return '#F39C12'; // Orange for connecting
    return '#27AE60'; // Green for start
  };

  const getButtonText = () => {
    if (isConnected) return 'Stop Voice Agent';
    if (isConnecting) return 'Connecting...';
    return 'Start Voice Agent';
  };

  const getButtonIcon = () => {
    if (isConnected) return '⏹️';
    if (isConnecting) return '🔄';
    return '🎤';
  };

  const isDisabled = isConnecting;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.mainButton,
          { backgroundColor: getButtonColor() },
          isDisabled && styles.disabledButton,
        ]}
        onPress={isConnected ? handleStop : handleStart}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonIcon}>{getButtonIcon()}</Text>
        <Text style={styles.buttonText}>{getButtonText()}</Text>
      </TouchableOpacity>
      
      {isConnected && (
        <View style={styles.statusContainer}>
          <View style={styles.pulseIndicator} />
          <Text style={styles.statusText}>Voice Agent Active</Text>
        </View>
      )}
      
      {isConnecting && (
        <View style={styles.statusContainer}>
          <Text style={styles.connectingText}>Establishing connection...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
  },
  pulseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#27AE60',
    marginRight: 8,
    // Note: For actual pulse animation, you'd need to use Animated API
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#27AE60',
  },
  connectingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F39C12',
    fontStyle: 'italic',
  },
});