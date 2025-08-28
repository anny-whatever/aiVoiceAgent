/**
 * Utility functions for parsing URL query parameters
 * Used to extract API key and UID from iframe URL for single-user mode
 */

export interface URLParams {
  apiKey: string | null;
  uid: string | null;
}

/**
 * Extracts API key and UID from URL query parameters
 * Expected format: localhost:5173?api=xxxxxxxxx&uid=yyyyyyyyy
 */
export function parseURLParams(): URLParams {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    apiKey: urlParams.get('api'),
    uid: urlParams.get('uid')
  };
}

/**
 * Validates that required URL parameters are present
 */
export function validateURLParams(params: URLParams): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!params.apiKey) {
    missing.push('api');
  }
  
  if (!params.uid) {
    missing.push('uid');
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Gets validated URL parameters or throws an error
 */
export function getRequiredURLParams(): URLParams {
  const params = parseURLParams();
  const validation = validateURLParams(params);
  
  if (!validation.valid) {
    throw new Error(`Missing required URL parameters: ${validation.missing.join(', ')}. Expected format: ?api=xxxxxxxxx&uid=yyyyyyyyy`);
  }
  
  return params;
}