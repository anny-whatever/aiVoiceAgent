// React Native doesn't have URL search params like web browsers
// This utility provides a way to handle parameters that might be passed
// through deep linking or other mechanisms

interface UrlParams {
  apiKey?: string;
  uid?: string;
}

// For React Native, we'll need to handle parameters differently
// This could be through:
// 1. Deep linking parameters
// 2. AsyncStorage for persistent values
// 3. Environment variables
// 4. Props passed from parent components

class UrlParamsManager {
  private params: UrlParams = {};

  // Set parameters programmatically
  setParams(params: UrlParams): void {
    this.params = { ...this.params, ...params };
  }

  // Get a specific parameter
  getParam(key: keyof UrlParams): string | undefined {
    return this.params[key];
  }

  // Get all parameters
  getAllParams(): UrlParams {
    return { ...this.params };
  }

  // Clear all parameters
  clearParams(): void {
    this.params = {};
  }

  // Parse parameters from a URL string (for deep linking)
  parseFromUrl(url: string): UrlParams {
    try {
      const urlObj = new URL(url);
      const searchParams = urlObj.searchParams;
      
      const params: UrlParams = {};
      
      const apiKey = searchParams.get('apiKey');
      const uid = searchParams.get('uid');
      
      if (apiKey) params.apiKey = apiKey;
      if (uid) params.uid = uid;
      
      // Update internal params
      this.setParams(params);
      
      return params;
    } catch (error) {
      console.error('Failed to parse URL parameters:', error);
      return {};
    }
  }
}

// Create a singleton instance
const urlParamsManager = new UrlParamsManager();

// Export functions that match the web version's interface
export const getUrlParam = (key: keyof UrlParams): string | undefined => {
  return urlParamsManager.getParam(key);
};

export const setUrlParams = (params: UrlParams): void => {
  urlParamsManager.setParams(params);
};

export const parseUrlParams = (url: string): UrlParams => {
  return urlParamsManager.parseFromUrl(url);
};

export const clearUrlParams = (): void => {
  urlParamsManager.clearParams();
};

export default urlParamsManager;