// config.ts - Environment configuration

// Determine the API URL based on environment
const getApiUrl = (): string => 
{
  // Development: Use Vite proxy
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // Production: Use environment variable or fallback
  const apiUrl = import.meta.env.VITE_API_URL;
  
   if (apiUrl) {
    // Ensure it has /api suffix
    return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
  }

  if (import.meta.env.PROD) {
    throw new Error('VITE_API_URL not set in production environment');
  }
  // Local Production build fallback
 console.warn('VITE_API_URL not set, using localhost fallback');
  return 'http://localhost:5000/api';
}
// Export the API URL
// 
export const API_URL = getApiUrl();

// Configuration object
export const CONFIG = {
  API_URL: getApiUrl(),
  ENV: import.meta.env.MODE,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
  APP_NAME: 'School ERP System',
} as const;

// Type for API response
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  timestamp?: string;
}

// Type for API error
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
}

export default CONFIG;  