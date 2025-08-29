import { useState, useEffect, useCallback } from 'react';
import PermissionsManager, { PermissionResult } from '../utils/permissions';

interface PermissionsState {
  microphone: PermissionResult | null;
  isLoading: boolean;
  isInitialized: boolean;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionsState>({
    microphone: null,
    isLoading: false,
    isInitialized: false,
  });

  // Check current permissions status
  const checkPermissions = useCallback(async () => {
    setPermissions(prev => ({ ...prev, isLoading: true }));
    
    try {
      const microphonePermission = await PermissionsManager.checkMicrophonePermission();
      
      setPermissions({
        microphone: microphonePermission,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissions(prev => ({
        ...prev,
        isLoading: false,
        isInitialized: true,
      }));
    }
  }, []);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    setPermissions(prev => ({ ...prev, isLoading: true }));
    
    try {
      const granted = await PermissionsManager.handlePermissionRequest('microphone');
      
      // Refresh permissions state
      await checkPermissions();
      
      return granted;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      setPermissions(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [checkPermissions]);

  // Setup all audio permissions and session
  const setupAudioPermissions = useCallback(async (): Promise<{
    success: boolean;
    message?: string;
  }> => {
    setPermissions(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await PermissionsManager.setupAudioPermissions();
      
      // Refresh permissions state
      await checkPermissions();
      
      return result;
    } catch (error) {
      console.error('Error setting up audio permissions:', error);
      setPermissions(prev => ({ ...prev, isLoading: false }));
      return {
        success: false,
        message: 'Failed to setup audio permissions.',
      };
    }
  }, [checkPermissions]);

  // Initialize permissions check on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Computed values
  const hasMicrophonePermission = permissions.microphone?.granted ?? false;
  const canRequestMicrophonePermission = permissions.microphone?.canAskAgain ?? true;
  const allPermissionsGranted = hasMicrophonePermission;

  return {
    // State
    permissions,
    isLoading: permissions.isLoading,
    isInitialized: permissions.isInitialized,
    
    // Computed values
    hasMicrophonePermission,
    canRequestMicrophonePermission,
    allPermissionsGranted,
    
    // Actions
    checkPermissions,
    requestMicrophonePermission,
    setupAudioPermissions,
  };
};

export default usePermissions;