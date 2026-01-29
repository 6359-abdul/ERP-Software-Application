import axios from 'axios';

// Auto-detect whether we're on localhost or network
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Local development - use Vite proxy (empty string means relative URLs)
        return '';
    } else {
        // Network access - use direct backend URL 
        return `http://${hostname}:5000`;
    }
};

// Set axios defaults
axios.defaults.baseURL = getApiBaseUrl();

export const API_BASE_URL = getApiBaseUrl();
