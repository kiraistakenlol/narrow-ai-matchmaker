import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {fetchAuthSession, signInWithRedirect, signOut} from 'aws-amplify/auth';
import {UserDto} from '@narrow-ai-matchmaker/common';
import type {RootState} from '../store';
import apiClient from '../../lib/apiClient';
import {AxiosError} from 'axios';


export type AuthStatus = 'N/A' | 'not-signed-in' | 'loading' | 'succeeded' | 'failed';

export interface AuthState {
    user: UserDto | null;
    status: AuthStatus;
    error: string | null;
    isOnboarded: boolean;
}

const initialState: AuthState = {
    user: null,
    status: 'N/A',
    error: null,
    isOnboarded: false,
};

// Return type is now UserDto | null
export const checkAuth = createAsyncThunk<
    UserDto | null, // Can fulfill with UserDto or null
    void,
    { rejectValue: string }
>('auth/checkAuth', async (_, { rejectWithValue }) => {
    let session;
    try {
        session = await fetchAuthSession({ forceRefresh: true }); // Keep forceRefresh here for explicit checks
    } catch (sessionError: any) {
        console.log('Auth check: No active session found.', sessionError?.message || sessionError);
        return null; // Not an error, just no session
    }

    const idToken = session.tokens?.idToken?.toString();
    if (!idToken) {
        console.log('Auth check: Session found but no ID token present.');
        return null; // No token, can't proceed
    }

    try {
        const response = await apiClient.get<UserDto>('/users/me');
        const userData = response.data;

        if (!userData.id || typeof userData.email === 'undefined') {
            console.error('Missing id or email in fetched UserDto', userData);
            return rejectWithValue('Incomplete user data received from backend.');
        }

        return userData;

    } catch (error) {
        let errorMessage = 'Unexpected error during authentication check';
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            if (status === 401) {
                await signOut();
            }
            const backendMessage = error.response?.data?.message;
            errorMessage = `Backend fetch failed (${status || 'N/A'}): ${backendMessage || error.message}`;
            console.error(`Auth check: /users/me fetch failed (${status || 'N/A'})`, error.response?.data || error);
        } else if (error instanceof Error) {
            errorMessage = error.message;
            console.error('Auth check unexpected error:', error);
        }
        return rejectWithValue(errorMessage);
    }
});

// Initiates Google Sign In redirect flow
export const signInWithGoogle = createAsyncThunk('auth/signInWithGoogle', async (_, { rejectWithValue }) => {
    try {
        await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
        console.error('Google Sign In initiation failed:', error);
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to start Google Sign In');
    }
});

// Handles sign out
export const signOutUser = createAsyncThunk('auth/signOutUser', async (_, { rejectWithValue }) => {
    try {
        await signOut();
    } catch (error) {
        console.error('Sign out failed:', error);
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to sign out');
    }
});

// --- Slice Definition --- 

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Optional: Add specific reducers if needed, e.g., clearError
        clearAuthError: (state) => {
            state.error = null;
        },
        // New reducer to reset state to initial (not-signed-in) values
        resetAuth: (state) => {
            state.user = null;
            state.status = 'not-signed-in';
            state.error = null;
            state.isOnboarded = false;
        }
    },
    extraReducers: (builder) => {
        builder
            // Reset onboarding status when starting auth check or on failure/signout
            .addCase(checkAuth.pending, (state) => {
                state.status = 'loading';
                state.error = null;
                state.isOnboarded = false; // Reset on pending
            })
            .addCase(checkAuth.fulfilled, (state, action: PayloadAction<UserDto | null>) => {
                const userData = action.payload;
                if (userData) {
                    // User is authenticated and data received
                    console.log('AuthSlice: checkAuth.fulfilled', userData);
                    
                    state.status = 'succeeded';
                    state.user = userData;
                    state.isOnboarded = !!userData.profile;
                    state.error = null;
                } else {
                    // No session found, user is not logged in
                    console.log('AuthSlice: checkAuth.fulfilled: No session found, user is not logged in');
                    state.status = 'not-signed-in'; // Set to not-signed-in instead of failed
                    state.user = null;
                    state.isOnboarded = false;
                    state.error = null; // No error, just not logged in
                }
            })
            .addCase(checkAuth.rejected, (state, action) => {
                // This now only handles actual errors during the check
                state.status = 'failed';
                state.user = null;
                state.isOnboarded = false;
                state.error = (action.payload as string) ?? 'Authentication check failed (unknown error)';
            })
            // signInWithGoogle (only handles initiation errors)
            .addCase(signInWithGoogle.pending, (state) => {
                state.status = 'loading'; 
                state.error = null;
                state.isOnboarded = false;
            })
            .addCase(signInWithGoogle.rejected, (state, action) => {
                // If sign-in initiation fails, return to not-signed-in, show error
                state.status = 'not-signed-in'; 
                state.error = (action.payload as string) ?? 'Google sign-in failed'; 
                state.isOnboarded = false;
            })
             // signOutUser
            .addCase(signOutUser.pending, (state) => {
                state.status = 'loading';
                state.user = null; // Clear user optimistically
                state.isOnboarded = false;
                state.error = null;
            })
            .addCase(signOutUser.fulfilled, (state) => {
                state.status = 'not-signed-in';
                state.user = null;
                state.error = null;
                state.isOnboarded = false;
            })
            .addCase(signOutUser.rejected, (state, action) => {
                state.status = 'not-signed-in'; // Or maybe 'failed'? Let's stick to not-signed-in for now.
                state.user = null; // Assume sign out happened despite error, or state is uncertain
                state.error = (action.payload as string) ?? 'Sign out failed'; 
                state.isOnboarded = false;
            });
    },
});

// --- Export Actions and Selectors --- 
export const { clearAuthError, resetAuth } = authSlice.actions;

// 5. Selector return type is now AuthUser | null
export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAuthError = (state: RootState) => state.auth.error;
// New selector for onboarding status
export const selectIsOnboarded = (state: RootState) => state.auth.isOnboarded;
// Updated isAuthenticated to also check onboarding status?
// No, keep isAuthenticated separate - it just means logged in.
export const selectIsAuthenticated = (state: RootState) => state.auth.status === 'succeeded' && !!state.auth.user;

export const selectAuthState = (state: RootState) => state.auth;

export default authSlice.reducer; 