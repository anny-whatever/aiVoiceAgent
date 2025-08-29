import Constants from 'expo-constants';

export interface AppConfig {
  uid: string;
  apiKey: string;
  backendUrl: string;
}

/**
 * Get app configuration from environment variables or constants
 * In a production app, these would come from secure storage or user input
 */
export function getAppConfig(): AppConfig {
  // Use hardcoded values from .env for proof of concept
  const config = {
    uid: process.env.UID || '0RzeMsFE8EdpQSAFnh70VeyLnIr2',
    apiKey: process.env.API_KEY || '5a0fe6a5eb768c1bb43999b8aa56a7cf',
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  };

  return config;
}

/**
 * Validate that required configuration is present
 */
export function validateConfig(config: AppConfig): { isValid: boolean; error?: string } {
  if (!config.uid) {
    return {
      isValid: false,
      error: 'User ID is required. Please configure EXPO_PUBLIC_UID.',
    };
  }

  if (!config.apiKey) {
    return {
      isValid: false,
      error: 'OpenAI API key is required. Please configure EXPO_PUBLIC_OPENAI_API_KEY.',
    };
  }

  if (!config.backendUrl) {
    return {
      isValid: false,
      error: 'Backend URL is required. Please configure EXPO_PUBLIC_BACKEND_URL.',
    };
  }

  return { isValid: true };
}

export default {
  getAppConfig,
  validateConfig,
};