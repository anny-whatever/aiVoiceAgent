import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ConnectionStatus } from '../types';

interface StatusIndicatorProps {
  connectionStatus: ConnectionStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  connectionStatus,
}) => {
  const { isConnected, isListening, isAISpeaking, status } = connectionStatus;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isAISpeaking || isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isAISpeaking, isListening, pulseAnim]);

  const getIndicatorStyle = () => {
    if (isAISpeaking) {
      return [styles.indicator, styles.aiSpeakingIndicator];
    }
    if (isListening) {
      return [styles.indicator, styles.listeningIndicator];
    }
    if (isConnected) {
      return [styles.indicator, styles.connectedIndicator];
    }
    return [styles.indicator, styles.disconnectedIndicator];
  };

  const getIcon = () => {
    if (isAISpeaking) return '🤖';
    if (isListening) return '🎤';
    if (isConnected) return '💭';
    return '🚗';
  };

  return (
    <View style={styles.container}>
      <View style={styles.indicatorContainer}>
        <Animated.View
          style={[
            getIndicatorStyle(),
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Text style={styles.icon}>{getIcon()}</Text>
        </Animated.View>
      </View>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  indicatorContainer: {
    position: 'relative',
  },
  indicator: {
    width: 144,
    height: 144,
    borderRadius: 72,
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
  aiSpeakingIndicator: {
    backgroundColor: '#3b82f6', // blue-500
  },
  listeningIndicator: {
    backgroundColor: '#10b981', // green-500
  },
  connectedIndicator: {
    backgroundColor: '#6b7280', // gray-500
  },
  disconnectedIndicator: {
    backgroundColor: '#9ca3af', // gray-400
  },
  icon: {
    fontSize: 48,
  },
  statusContainer: {
    marginTop: 16,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.5)', // gray-800/50
    borderRadius: 8,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)', // gray-700/50
  },
});