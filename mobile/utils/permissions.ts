import { Platform, Alert, Linking } from 'react-native';
import { AudioModule, setAudioModeAsync } from 'expo-audio';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

export class PermissionsManager {
  /**
   * Request microphone permission for audio recording
   */
  static async requestMicrophonePermission(): Promise<PermissionResult> {
    try {
      const { status, canAskAgain } = await AudioModule.requestRecordingPermissionsAsync();
      
      if (status === 'granted') {
        return {
          granted: true,
          canAskAgain: true,
        };
      }
      
      return {
        granted: false,
        canAskAgain,
        message: 'Microphone permission is required for voice communication.',
      };
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        message: 'Failed to request microphone permission.',
      };
    }
  }

  /**
   * Check if microphone permission is already granted
   */
  static async checkMicrophonePermission(): Promise<PermissionResult> {
    try {
      const { status, canAskAgain } = await AudioModule.getRecordingPermissionsAsync();
      
      return {
        granted: status === 'granted',
        canAskAgain,
      };
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        message: 'Failed to check microphone permission.',
      };
    }
  }

  /**
   * Request all necessary permissions for the app
   */
  static async requestAllPermissions(): Promise<{
    microphone: PermissionResult;
  }> {
    const microphone = await this.requestMicrophonePermission();
    
    return {
      microphone,
    };
  }

  /**
   * Show permission denied alert with option to open settings
   */
  static showPermissionDeniedAlert(
    permissionName: string,
    message: string = `${permissionName} permission is required for this feature to work.`
  ): void {
    Alert.alert(
      `${permissionName} Permission Required`,
      `${message} Please grant permission in your device settings.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }

  /**
   * Handle permission request with user-friendly messaging
   */
  static async handlePermissionRequest(
    permissionType: 'microphone',
    showAlertOnDenied: boolean = true
  ): Promise<boolean> {
    let result: PermissionResult;
    
    switch (permissionType) {
      case 'microphone':
        // First check if we already have permission
        const existingPermission = await this.checkMicrophonePermission();
        if (existingPermission.granted) {
          return true;
        }
        
        // Request permission if we don't have it
        result = await this.requestMicrophonePermission();
        break;
      default:
        return false;
    }
    
    if (!result.granted && showAlertOnDenied) {
      if (!result.canAskAgain) {
        this.showPermissionDeniedAlert(
          permissionType.charAt(0).toUpperCase() + permissionType.slice(1),
          result.message
        );
      } else {
        Alert.alert(
          'Permission Required',
          result.message || `${permissionType} permission is required.`,
          [{ text: 'OK' }]
        );
      }
    }
    
    return result.granted;
  }

  /**
   * Initialize audio session for recording
   */
  static async initializeAudioSession(): Promise<boolean> {
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      return true;
    } catch (error) {
      console.error('Error initializing audio session:', error);
      return false;
    }
  }

  /**
   * Complete setup for audio permissions and session
   */
  static async setupAudioPermissions(): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      // Request microphone permission
      const micPermissionGranted = await this.handlePermissionRequest('microphone');
      
      if (!micPermissionGranted) {
        return {
          success: false,
          message: 'Microphone permission is required for voice communication.',
        };
      }
      
      // Initialize audio session
      const audioSessionInitialized = await this.initializeAudioSession();
      
      if (!audioSessionInitialized) {
        return {
          success: false,
          message: 'Failed to initialize audio session.',
        };
      }
      
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error setting up audio permissions:', error);
      return {
        success: false,
        message: 'Failed to set up audio permissions.',
      };
    }
  }
}

export default PermissionsManager;