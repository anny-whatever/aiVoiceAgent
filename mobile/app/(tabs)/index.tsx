import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AIVoiceAgentBrowser from '@/components/AIVoiceAgentBrowser';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Voice Agent App</Text>
      <AIVoiceAgentBrowser />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
});
