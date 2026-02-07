// API Configuration for Network Access
// This allows the frontend to work when accessed via network IP

const getApiBaseUrl = () => {
    // Always use proxy /api to avoid Mixed Content / Private Network Access issues
    // The Vite proxy will handle the redirection to 5000
    return '/api';
};

export const API_BASE_URL = getApiBaseUrl(); 
