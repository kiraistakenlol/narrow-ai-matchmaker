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

export const checkAuth = createAsyncThunk<
    UserDto, // Return full UserDto on success
    void,
    { rejectValue: string }
>('auth/checkAuth', async (_, { rejectWithValue }) => {
    try {
        const session = await fetchAuthSession({ forceRefresh: true });
        const idToken = session.tokens?.idToken?.toString();
        if (!idToken) {
            throw new Error('No ID token found in session.');
        }
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${idToken}` },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Auth check: /users/me fetch failed (${response.status})`, errorBody);
            return rejectWithValue(`Backend fetch failed: ${response.status}`);
        }
        const userData: UserDto = await response.json(); 
        
        // Basic validation before returning
        if (!userData.id || typeof userData.email === 'undefined') { // Check email existence
             console.error('Missing id or email in fetched UserDto', userData);
            return rejectWithValue('Incomplete user data received from backend.');
        }

        return userData; // Fulfill with the full UserDto object
    } catch (error) {
        console.log('Auth check failed:', error);
        return rejectWithValue(error instanceof Error ? error.message : 'Authentication check failed');
    }
});

// Initiates Google Sign In redirect flow
export const signInWithGoogle = createAsyncThunk('auth/signInWithGoogle', async (_, { rejectWithValue }) => {
    try {
        await signInWithRedirect({ provider: 'Google' });
        // No return value needed, Amplify handles redirect
    } catch (error) {
        console.error('Google Sign In initiation failed:', error);
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to start Google Sign In');
    }
});

// Handles sign out
export const signOutUser = createAsyncThunk('auth/signOutUser', async (_, { rejectWithValue }) => {
    try {
        await signOut();
        // No return value needed
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
            .addCase(checkAuth.fulfilled, (state, action: PayloadAction<UserDto>) => {
                state.status = 'succeeded';
                // Extract id/email for state.user
                state.user = {
                    id: action.payload.id,
                    email: action.payload.email ?? '' // Handle potential null email if schema allows
                };
                // Set onboarding status based on profile presence
                state.isOnboarded = !!action.payload.profile;
                state.error = null; // Clear error on success
            })
            .addCase(checkAuth.rejected, (state, action) => {
                state.status = 'failed';
                state.user = null;
                state.isOnboarded = false; // Reset on failure
                state.error = (action.payload as string) ?? 'Authentication check failed (unknown error)';
            })
            // signInWithGoogle (only handles initiation errors)
            .addCase(signInWithGoogle.pending, (state) => {
                state.status = 'loading'; 
                state.error = null;
                state.isOnboarded = false;
            })
            .addCase(signInWithGoogle.rejected, (state, action) => {
                state.status = 'idle'; 
                state.error = (action.payload as string) ?? 'Google sign-in failed'; 
                state.isOnboarded = false;
            })
             // signOutUser
            .addCase(signOutUser.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(signOutUser.fulfilled, (state) => {
                state.status = 'idle';
                state.user = null;
                state.error = null;
                state.isOnboarded = false; // Reset on sign out
            })
            .addCase(signOutUser.rejected, (state, action) => {
                state.status = 'idle'; 
                state.user = null;
                state.error = (action.payload as string) ?? 'Sign out failed'; 
                state.isOnboarded = false; // Reset on sign out failure too
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