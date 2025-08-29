import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import AIVoiceAgentWebView from '@/components/AIVoiceAgentWebView';

export default function HomeScreen() {
  const aiVoiceAgentUrl = 'https://newtest.complianceone.ai/?api=5a0fe6a5eb768c1bb43999b8aa56a7cf&uid=0RzeMsFE8EdpQSAFnh70VeyLnIr2';

  return (
    <ThemedView style={styles.container}>
      <AIVoiceAgentWebView url={aiVoiceAgentUrl} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
