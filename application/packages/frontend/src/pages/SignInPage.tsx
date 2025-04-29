import React from 'react';
import { signInWithRedirect } from 'aws-amplify/auth'; // Import the specific function

function SignInPage() {

    const handleGoogleSignIn = async () => {
        try {
            // Use signInWithRedirect for the Hosted UI flow
            await signInWithRedirect({ provider: 'Google' }); 
        } catch (error) {
            console.error('Error signing in with Google:', error);
            // TODO: Add user-facing error handling
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Sign In</h1>
            <p style={styles.description}>
                Sign in or create an account to get started.
            </p>
            <button 
                onClick={handleGoogleSignIn} 
                style={styles.googleButton}
            >
                Sign in with Google
            </button>
        </div>
    );
}

// Basic styles for layout and appearance
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        backgroundColor: '#f8f9fa'
    },
    title: {
        marginBottom: '10px',
        color: '#343a40'
    },
    description: {
        marginBottom: '30px',
        color: '#6c757d'
    },
    googleButton: {
        padding: '12px 25px',
        fontSize: '16px',
        backgroundColor: '#4285F4', // Google Blue
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'background-color 0.3s ease'
    }
};


export default SignInPage; 