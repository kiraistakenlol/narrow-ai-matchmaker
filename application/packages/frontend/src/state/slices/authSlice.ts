import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchAuthSession, signInWithRedirect, signOut } from 'aws-amplify/auth';
import { UserDto } from '@narrow-ai-matchmaker/common';
import type { RootState } from '../store'; // For selector typing

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

interface AuthUser {
    id: string;
    email: string;
}
export type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface AuthState {
    user: AuthUser | null;
    status: AuthStatus;
    error: string | null;
    isOnboarded: boolean;
}

const initialState: AuthState = {
    user: null,
    status: 'idle',
    error: null,
    isOnboarded: false,
};

// Return type is now UserDto | null
export const checkAuth = createAsyncThunk<
    UserDto | null, // Can fulfill with UserDto or null
    void,
    { rejectValue: string }
>('auth/checkAuth', async (_, { rejectWithValue }) => {
    try {
        let session;
        try {
             session = await fetchAuthSession({ forceRefresh: true });
        } catch (sessionError: any) {
             // Amplify throws specific errors, e.g., if user is not signed in.
             // We'll treat this as "not logged in" rather than a failure.
            console.log('Auth check: No active session found.', sessionError?.message || sessionError);
            return null; // Fulfill with null to indicate no session
        }

        const idToken = session.tokens?.idToken?.toString();
        if (!idToken) {
            console.log('Auth check: Session found but no ID token present.');
            return null; // Fulfill with null if session exists but token doesn't
        }

        // If we have a token, try fetching user data from backend
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${idToken}` },
        });

        if (!response.ok) {
            // If backend fails AFTER we found a token, THIS is a failure
            const errorBody = await response.text();
            console.error(`Auth check: /users/me fetch failed (${response.status}) after finding token.`, errorBody);
            return rejectWithValue(`Backend fetch failed: ${response.status}`);
        }

        const userData: UserDto = await response.json();

        if (!userData.id || typeof userData.email === 'undefined') {
            console.error('Missing id or email in fetched UserDto', userData);
            // Treat incomplete data after successful fetch as a failure
            return rejectWithValue('Incomplete user data received from backend.');
        }

        return userData; // Fulfill with the full UserDto object on success

    } catch (error) {
        // Catch any other unexpected errors during the process
        console.error('Auth check unexpected error:', error);
        return rejectWithValue(error instanceof Error ? error.message : 'Unexpected error during authentication check');
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
                    state.status = 'succeeded';
                    state.user = {
                        id: userData.id,
                        email: userData.email ?? ''
                    };
                    state.isOnboarded = !!userData.profile;
                    state.error = null;
                } else {
                    // No session found, user is not logged in
                    state.status = 'idle'; // Set to idle instead of failed
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
                // If sign-in initiation fails, return to idle, show error
                state.status = 'idle'; 
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
                state.status = 'idle';
                state.user = null;
                state.error = null;
                state.isOnboarded = false;
            })
            .addCase(signOutUser.rejected, (state, action) => {
                state.status = 'idle'; // Or maybe 'failed'? Let's stick to idle for now.
                state.user = null; // Assume sign out happened despite error, or state is uncertain
                state.error = (action.payload as string) ?? 'Sign out failed'; 
                state.isOnboarded = false;
            });
    },
});

// --- Export Actions and Selectors --- 
export const { clearAuthError } = authSlice.actions;

// 5. Selector return type is now AuthUser | null
export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAuthError = (state: RootState) => state.auth.error;
// New selector for onboarding status
export const selectIsOnboarded = (state: RootState) => state.auth.isOnboarded;
// Updated isAuthenticated to also check onboarding status?
// No, keep isAuthenticated separate - it just means logged in.
export const selectIsAuthenticated = (state: RootState) => state.auth.status === 'succeeded' && !!state.auth.user;

export default authSlice.reducer; 