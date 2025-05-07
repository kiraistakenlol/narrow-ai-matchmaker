import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
// import { store } from '../state/store'; // No longer needed for token
import {
    OnboardingDto,
    OnboardingGuidanceDto,
    PresignedUrlResponseDto,
    ProfileData,
    MatchDto,
} from '@narrow-ai-matchmaker/common';

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

// Response interceptor
apiClient.interceptors.response.use(
    (response) => {
        const originalData = response.data;
        const isBackendWrapper = 
            response.status >= 200 && response.status < 300 &&
            originalData && typeof originalData === 'object' &&
            Object.prototype.hasOwnProperty.call(originalData, 'data');

        if (isBackendWrapper) {
            response.data = originalData.data; 
            return response;
        }
        
        return response;
    },
    (error) => {
        console.error('Axios response error:', error.response?.status, error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export const fetchBaseGuidance = async (): Promise<OnboardingGuidanceDto> => {
    const response = await apiClient.get<OnboardingGuidanceDto>('/onboarding/base-guidance');
    return response.data;
};

export const fetchOnboardingById = async (onboardingId: string): Promise<OnboardingDto> => {
    const response = await apiClient.get<OnboardingDto>(`/onboarding/${onboardingId}`);
    return response.data;
};

export const findMyUserOnboarding = async (): Promise<OnboardingDto | null> => {
    const response = await apiClient.get<OnboardingDto>('/onboarding');
    return response.data;
};

export const createOnboardingSession = async (payload: { event_id?: string }): Promise<OnboardingDto> => {
    const response = await apiClient.post<OnboardingDto>('/onboarding', payload);
    return response.data;
};

export const getAudioUploadUrl = async (onboardingId: string): Promise<PresignedUrlResponseDto> => {
    const response = await apiClient.post<PresignedUrlResponseDto>(
        `/onboarding/${onboardingId}/audio-upload-url`
    );
    return response.data;
};

export const notifyUploadComplete = async (onboardingId: string, s3Key: string): Promise<void> => {
    await apiClient.post(`/onboarding/${onboardingId}/notify-upload`, { s3_key: s3Key });
};

export const fetchUserProfile = async (userId?: string): Promise<ProfileData> => {
    const endpoint = userId ? `/users/${userId}` : '/users/me';
    const response = await apiClient.get(endpoint);
    const userDto = response.data;
    if (!userDto.profile) {
        console.warn(`No profile data found for user via DTO from ${endpoint}`);
        return { 
            raw_input: null, personal: { name: null, headline: null, visiting_status: null }, 
            skills: { hard: [], soft: [] }, industries: [], hobbies: [], roles: [], extra_notes: null 
        } as ProfileData;
    }
    return userDto.profile;
};

export const fetchMyMatches = async (): Promise<MatchDto[]> => {
    const response = await apiClient.get<MatchDto[]>('/users/me/matches');
    return response.data;
};

export default apiClient; 