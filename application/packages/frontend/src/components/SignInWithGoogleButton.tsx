import React from 'react';
import {signInWithGoogle, signOutUser} from "../state/slices/authSlice.ts";
import {useAppDispatch} from "../hooks/hooks.ts";

interface SignInWithGoogleButtonProps {
    disabled?: boolean;
    onClick?: () => void;
}

function SignInWithGoogleButton({disabled = false, onClick = () => {}}: SignInWithGoogleButtonProps) {
    const dispatch = useAppDispatch();
    
    const handleSignInClick = async () => {
        try {
            // 1. Attempt sign out first
            console.log('SignInButton: Attempting sign out...');
            await dispatch(signOutUser()).unwrap();
            console.log('SignInButton: Sign out successful.');
        } catch (signOutError) {
            // Log the sign-out error but proceed anyway
            console.warn('SignInButton: Sign out failed or user was not signed in, proceeding with sign in attempt.', signOutError);
        }
        
        try {
             // 2. Attempt sign in with Google
            console.log('SignInButton: Dispatching signInWithGoogle...');
            await dispatch(signInWithGoogle()).unwrap();
             // The actual redirect happens via Amplify, no further action here on success
             onClick();
         } catch (signInError) {
             // Handle errors specifically from the signInWithGoogle initiation
            console.error('SignInButton: Google Sign In initiation failed:', signInError);
             // Maybe display an error to the user?
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