import Constants from 'expo-constants';

// Environment configuration for the mobile app
export const Environment = {
  // OpenAI API Key - should be set in .env file
  OPENAI_API_KEY: Constants.expoConfig?.extra?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
  
  // Backend URL - defaults to localhost for development
  BACKEND_URL: Constants.expoConfig?.extra?.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001',
  
  // Development mode flag
  DEV_MODE: Constants.expoConfig?.extra?.DEV_MODE || process.env.DEV_MODE === 'true' || __DEV__,
};

// Validation function to check if required environment variables are set
export const validateEnvironment = (): { isValid: boolean; missingVars: string[] } => {
  const missingVars: string[] = [];
  
  if (!Environment.OPENAI_API_KEY) {
    missingVars.push('OPENAI_API_KEY');
  }
  
  if (!Environment.BACKEND_URL) {
    missingVars.push('BACKEND_URL');
  }
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
};

// Log environment status in development
if (Environment.DEV_MODE) {
  const { isValid, missingVars } = validateEnvironment();
  
  if (!isValid) {
    console.warn('⚠️ Missing environment variables:', missingVars.join(', '));
    console.warn('Please check your .env file or app.json extra configuration.');
  } else {
    console.log('✅ Environment variables loaded successfully');
  }
}