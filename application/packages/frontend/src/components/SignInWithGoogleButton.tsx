import React from 'react';
import {signInWithGoogle} from "../state/slices/authSlice.ts";
import {useAppDispatch} from "../state/hooks.ts";

interface SignInWithGoogleButtonProps {
    disabled?: boolean;
}

function SignInWithGoogleButton({disabled = false}: SignInWithGoogleButtonProps) {
    const dispatch = useAppDispatch();
    return (
        <button
            onClick={() => {
                dispatch(signInWithGoogle());
                onClick()
            }}
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