import axios from 'axios';
import {fetchAuthSession} from 'aws-amplify/auth';
// import { store } from '../state/store'; // No longer needed for token

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Request interceptor to dynamically add auth token from Amplify session
apiClient.interceptors.request.use(
    async (config) => {
        try {
            // Attempt to fetch the current session
            const session = await fetchAuthSession({ forceRefresh: false }); // Don't force refresh for every API call
            const idToken = session.tokens?.idToken?.toString();

            if (idToken) {
                config.headers.Authorization = `Bearer ${idToken}`;
            }
        } catch (error) {
            // If fetchAuthSession fails (e.g., user not logged in), proceed without Authorization header
            console.log('No active Amplify session found or error fetching session, request sent without token.', error);
        }
        return config;
    },
    (error) => {
        // Handle request configuration error
        console.error('Axios request config error:', error);
        return Promise.reject(error);
    }
);

// Optional: Response interceptor for global error handling
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // You can add global error handling logic here (e.g., redirect on 401)
        console.error('Axios response error:', error.response?.status, error.response?.data || error.message);
        // Potentially trigger a sign-out action if 401 Unauthorized is received
        // if (error.response?.status === 401) {
        //     store.dispatch(signOutUser()); // Need to import signOutUser action
        // }
        return Promise.reject(error);
    }
);

export default apiClient; 