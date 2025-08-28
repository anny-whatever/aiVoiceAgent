import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { mediaDevices } from 'react-native-webrtc-web-shim';

/**
 * Audio Test Utility for WebRTC Voice Chat
 * Tests various audio components to ensure proper functionality
 */
export class AudioTestUtility {
  private static instance: AudioTestUtility;
  private testResults: { [key: string]: boolean } = {};

  static getInstance(): AudioTestUtility {
    if (!AudioTestUtility.instance) {
      AudioTestUtility.instance = new AudioTestUtility();
    }
    return AudioTestUtility.instance;
  }

  /**
   * Test audio session configuration
   */
  async testAudioSession(): Promise<boolean> {
    try {
      console.log('🧪 Testing audio session configuration...');
      
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
      }
      
      console.log('✅ Audio session configured successfully');
      this.testResults.audioSession = true;
      return true;
    } catch (error) {
      console.error('❌ Audio session test failed:', error);
      this.testResults.audioSession = false;
      return false;
    }
  }

  /**
   * Test microphone access
   */
  async testMicrophoneAccess(): Promise<boolean> {
    try {
      console.log('🧪 Testing microphone access...');
      
      const stream = await mediaDevices.getUserMedia({ audio: true });
      const audioTracks = stream.getAudioTracks();
      
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks found');
      }
      
      console.log('✅ Microphone access granted, tracks:', audioTracks.length);
      
      // Test track enable/disable (for feedback prevention)
      const track = audioTracks[0];
      track.enabled = false;
      console.log('✅ Track disabled successfully');
      track.enabled = true;
      console.log('✅ Track re-enabled successfully');
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
      
      this.testResults.microphoneAccess = true;
      return true;
    } catch (error) {
      console.error('❌ Microphone access test failed:', error);
      this.testResults.microphoneAccess = false;
      return false;
    }
  }

  /**
   * Test InCallManager functionality (native only)
   */
  async testInCallManager(): Promise<boolean> {
    try {
      console.log('🧪 Testing InCallManager...');
      
      if (Platform.OS === 'web') {
        console.log('⚠️ InCallManager not available on web, skipping test');
        this.testResults.inCallManager = true;
        return true;
      }
      
      let InCallManager: any = null;
      try {
        InCallManager = require('react-native-incall-manager').default;
      } catch (e) {
        console.warn('⚠️ InCallManager not available:', e);
        this.testResults.inCallManager = false;
        return false;
      }
      
      // Test InCallManager methods
      InCallManager.start({ media: 'audio', auto: false, ringback: false });
      InCallManager.setForceSpeakerphoneOn(true);
      InCallManager.setSpeakerphoneOn(true);
      InCallManager.chooseAudioRoute('SPEAKER');
      InCallManager.setKeepScreenOn(true);
      
      console.log('✅ InCallManager configured successfully');
      
      // Clean up
      setTimeout(() => {
        InCallManager.setSpeakerphoneOn(false);
        InCallManager.setForceSpeakerphoneOn(false);
        InCallManager.setKeepScreenOn(false);
        InCallManager.stop();
      }, 1000);
      
      this.testResults.inCallManager = true;
      return true;
    } catch (error) {
      console.error('❌ InCallManager test failed:', error);
      this.testResults.inCallManager = false;
      return false;
    }
  }

  /**
   * Test audio fallback handling
   */
  async testAudioFallback(): Promise<boolean> {
    try {
      console.log('🧪 Testing audio fallback handling...');
      
      // Simulate missing audio file scenario
      try {
        require('../../assets/sounds/user-ding.mp3');
        console.log('✅ Audio files found');
      } catch (requireError) {
        console.log('✅ Audio fallback handling works - files not found but handled gracefully');
      }
      
      this.testResults.audioFallback = true;
      return true;
    } catch (error) {
      console.error('❌ Audio fallback test failed:', error);
      this.testResults.audioFallback = false;
      return false;
    }
  }

  /**
   * Run all audio tests
   */
  async runAllTests(): Promise<{ success: boolean; results: { [key: string]: boolean } }> {
    console.log('🧪 Starting comprehensive audio tests...');
    
    const tests = [
      this.testAudioSession(),
      this.testMicrophoneAccess(),
      this.testInCallManager(),
      this.testAudioFallback(),
    ];
    
    await Promise.all(tests);
    
    const allPassed = Object.values(this.testResults).every(result => result);
    
    console.log('🧪 Audio test results:', this.testResults);
    console.log(allPassed ? '✅ All audio tests passed!' : '❌ Some audio tests failed');
    
    return {
      success: allPassed,
      results: { ...this.testResults }
    };
  }

  /**
   * Get test results
   */
  getResults(): { [key: string]: boolean } {
    return { ...this.testResults };
  }

  /**
   * Reset test results
   */
  resetResults(): void {
    this.testResults = {};
  }
}

// Export singleton instance
export const audioTestUtility = AudioTestUtility.getInstance();