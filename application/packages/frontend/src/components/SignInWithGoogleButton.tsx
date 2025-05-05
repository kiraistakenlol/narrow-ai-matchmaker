import React from 'react';
import {signInWithGoogle, resetAuth} from "../state/slices/authSlice.ts";
import {useAppDispatch} from "../hooks/hooks.ts";
import { fetchAuthSession, signOut } from 'aws-amplify/auth';

interface SignInWithGoogleButtonProps {
    disabled?: boolean;
}

function SignInWithGoogleButton({disabled = false}: SignInWithGoogleButtonProps) {
    const dispatch = useAppDispatch();

    const handleSignInClick = async () => {
        // 1. Check if Amplify thinks a user is already signed in
        let amplifySessionExists = false;
        try {
            const session = await fetchAuthSession({ forceRefresh: false });
            amplifySessionExists = !!session.tokens?.idToken && !!session.tokens?.accessToken;
        } catch (err) {
            // Error fetching session means no session exists
            amplifySessionExists = false;
            console.log('SignInButton: No pre-existing Amplify session found.');
        }

        // 2. If Amplify session exists, sign out directly AND reset Redux state
        if (amplifySessionExists) {
            console.log('SignInButton: Pre-existing Amplify session detected. Attempting direct sign out and Redux reset...');
            try {
                await signOut(); // Direct Amplify sign out
                dispatch(resetAuth()); // Reset Redux state to match
                console.log('SignInButton: Direct sign out and Redux reset successful.');
            } catch (signOutError) {
                console.warn('SignInButton: Direct sign out failed. Resetting Redux state anyway and proceeding with sign in attempt.', signOutError);
                // Still reset Redux state even if Amplify sign out fails, to be safe
                dispatch(resetAuth()); 
            }
        }

        // 3. Proceed with the sign-in attempt via Redux thunk
        try {
            console.log('SignInButton: Dispatching signInWithGoogle...');
            await dispatch(signInWithGoogle()).unwrap();
         } catch (signInError) {
            // Handle errors specifically from the signInWithGoogle initiation
            console.error('SignInButton: Google Sign In initiation failed:', signInError);
             // Display error to user?
         }
    };

    return (
        <button
            onClick={handleSignInClick}
            style={{...styles.button, ...styles.googleButton}}
            disabled={disabled}
        >
            Sign In with Google
        </button>
    );
}

// Minimal styles (consider centralizing)
const styles: { [key: string]: React.CSSProperties } = {
    button: {
        padding: '10px 20px',
        fontSize: '1rem',
        cursor: 'pointer',
        border: '1px solid #ccc',
        borderRadius: '4px'
    },
    googleButton: {
        backgroundColor: '#4285F4',
        color: 'white',
        borderColor: '#4285F4'
    }
};

export default SignInWithGoogleButton; 