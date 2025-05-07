import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../store';
import { fetchOnboardingById, fetchBaseGuidance } from '../../lib/apiClient';
import { STORAGE_KEYS } from '../../constants/storage';
import { AxiosError } from 'axios';
import { OnboardingGuidanceDto, OnboardingDto, OnboardingSessionDto } from '@narrow-ai-matchmaker/common';


export type OnboardingSliceStateLoadingStatus = 'idle' | 'loading' | 'succeeded' | 'failed' | 'no-id-found';

interface OnboardingState {
    initialStateLoaded: boolean
    session: OnboardingSessionDto | null;
    guidance: OnboardingGuidanceDto | null;
    loadingStatus: OnboardingSliceStateLoadingStatus;
    error: string | null;
}

const initialState: OnboardingState = {
    initialStateLoaded: false,
    session: null,
    guidance: null,
    loadingStatus: 'idle',
    error: null,
};

export const fetchOnboardingData = createAsyncThunk<
    OnboardingDto,
    string,
    { rejectValue: string | { noIdFound: true } }
>('onboarding/fetchData', async (onboardingId, { rejectWithValue }) => {
    if (!onboardingId) {
        return rejectWithValue({ noIdFound: true });
    }

    try {
        const response = await fetchOnboardingById(onboardingId);
        return response;
    } catch (error) {
        if (error instanceof AxiosError) {
            const backendMessage = error.response?.data?.message;
            return rejectWithValue(backendMessage || error.message || 'Failed to fetch onboarding data');
        }
        if (error instanceof Error) {
            return rejectWithValue(error.message);
        }
        return rejectWithValue('An unexpected error occurred while fetching onboarding data');
    }
});

export const initializeOnboarding = createAsyncThunk<
    void,
    void,
    { dispatch: AppDispatch; rejectValue: string }
>('onboarding/initialize', async (_, { dispatch, rejectWithValue }) => {
    const storedOnboardingId = localStorage.getItem(STORAGE_KEYS.ONBOARDING_ID);
    try {
        if (storedOnboardingId) {
            try {
                const onboarding = await fetchOnboardingById(storedOnboardingId);
                dispatch(setSession(onboarding.session));
                dispatch(setGuidance(onboarding.guidance));
            } catch (error) {
                const guidance = await fetchBaseGuidance();
                dispatch(setGuidance(guidance));
                return;
            }
        } else {
            dispatch(setSession(null));
            const guidance = await fetchBaseGuidance();
            dispatch(setGuidance(guidance));
        }
    } catch (error) {
        console.error("Failed to initialize onboarding state:", error);
        dispatch(setSession(null));
        dispatch(setGuidance(null));
        if (error instanceof AxiosError) {
            const backendMessage = error.response?.data?.message;
            return rejectWithValue(backendMessage || error.message || 'Failed to initialize onboarding state');
        }
        if (error instanceof Error) {
            return rejectWithValue(error.message);
        }
        return rejectWithValue('An unexpected error occurred during onboarding initialization');
    }
});

export const onboardingSlice = createSlice({
    name: 'onboarding',
    initialState,
    reducers: {
        setSession: (state, action: PayloadAction<OnboardingSessionDto | null>) => {
            state.session = action.payload;
            if (action.payload && action.payload.id) {
                localStorage.setItem(STORAGE_KEYS.ONBOARDING_ID, action.payload.id);
                state.loadingStatus = 'succeeded';
                state.error = null;
            }
        },
        setGuidance: (state, action: PayloadAction<OnboardingGuidanceDto | null>) => {
            state.guidance = action.payload;
            state.loadingStatus = 'succeeded';
            state.error = null;
        },
        resetOnboardingState: () => initialState,
        clearOnboardingError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchOnboardingData.pending, (state) => {
                state.loadingStatus = 'loading';
                state.error = null;
            })
            .addCase(fetchOnboardingData.fulfilled, (state, action: PayloadAction<OnboardingDto>) => {
                state.loadingStatus = 'succeeded';
                state.error = null;

                const newSession = action.payload.session;
                const newGuidance = action.payload.guidance;

                if (JSON.stringify(state.session) !== JSON.stringify(newSession)) {
                    state.session = newSession;
                }
                if (JSON.stringify(state.guidance) !== JSON.stringify(newGuidance)) {
                    state.guidance = newGuidance;
                }
            })
            .addCase(fetchOnboardingData.rejected, (state, action) => {
                if (action.payload && typeof action.payload === 'object' && 'noIdFound' in action.payload) {
                    state.loadingStatus = 'no-id-found';
                    state.session = null;
                    state.guidance = null;
                    state.error = null;
                } else {
                    state.loadingStatus = 'failed';
                    state.session = null;
                    state.guidance = null;
                    state.error = (action.payload as string) || 'Unknown error fetching onboarding data';
                }
            })
            .addCase(initializeOnboarding.pending, (state) => {
                state.loadingStatus = 'loading';
                state.error = null;
            })
            .addCase(initializeOnboarding.fulfilled, (state) => {
                state.loadingStatus = 'succeeded';
                state.error = null;
                state.initialStateLoaded = true;
            })
            .addCase(initializeOnboarding.rejected, (state, action) => {
                state.loadingStatus = 'failed';
                state.error = action.payload as string;
                state.initialStateLoaded = true;
            });
    },
});

export const { resetOnboardingState, clearOnboardingError, setSession, setGuidance } = onboardingSlice.actions;

// Selectors
export const selectOnboardingSession = (state: RootState): OnboardingSessionDto | null => state.onboarding.session;
export const selectOnboardingGuidance = (state: RootState): OnboardingGuidanceDto | null => state.onboarding.guidance;
export const selectOnboardingStatus = (state: RootState): OnboardingSliceStateLoadingStatus => state.onboarding.loadingStatus;
export const selectOnboardingError = (state: RootState): string | null => state.onboarding.error;
export const selectFullOnboardingState = (state: RootState): OnboardingState => state.onboarding;

export default onboardingSlice.reducer; 