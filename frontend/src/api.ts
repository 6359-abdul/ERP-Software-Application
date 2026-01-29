import axios from 'axios';
import { API_URL } from './config';

// Create a configured axios instance
// We use a relative path '/api' to leverage the Vite proxy defined in vite.config.ts
// This ensures requests go to the backend (port 5000) without CORS issues.
const api = axios.create({
    baseURL: '/api',
});

api.interceptors.request.use(
    (config) => {
        // Get headers from localStorage
        const savedUser = localStorage.getItem('user');
        const academicYear = localStorage.getItem('academicYear');
        const currentBranch = localStorage.getItem('currentBranch');
        const token = localStorage.getItem('token');

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        if (savedUser) {
            const user = JSON.parse(savedUser);

            // Priority: Explicitly selected branch (Admin switcher) if it's not an "All*" value.
            // Only fall back to user's assigned branch when there is NO explicit selection stored.
            if (currentBranch && !currentBranch.toLowerCase().startsWith('all')) {
                config.headers['X-Branch'] = currentBranch;
            } else if (!currentBranch && user.branch && !user.branch.toLowerCase().startsWith('all')) {
                config.headers['X-Branch'] = user.branch;
            }

            if (user.location) {
                config.headers['X-Location'] = user.location;
            }
        }

        // Always enforce a default Academic Year if missing, to avoid 400 Bad Request from backend
        if (!config.headers['X-Academic-Year']) {
            const effectiveYear = academicYear || localStorage.getItem('academicYear');
            if (effectiveYear) {
                config.headers['X-Academic-Year'] = effectiveYear;
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
