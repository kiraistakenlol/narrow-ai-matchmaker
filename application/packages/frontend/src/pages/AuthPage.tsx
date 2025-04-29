import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../state/hooks';
import { 
    signInWithGoogle, 
    selectAuthStatus 
} from '../state/slices/authSlice';

function AuthPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const status = useAppSelector(selectAuthStatus);

     useEffect(() => {
        // Redirect if checkAuth (from App.tsx) succeeded
        if (status === 'succeeded') {
            navigate('/');
        }
    }, [status, navigate]);

    const handleGoogleSignIn = () => {
        dispatch(signInWithGoogle());
    };
    
    const handleStartOnboarding = () => {
        console.log('Start Onboarding Clicked');
        // TODO: Implement onboarding flow trigger
    };

    // Show loading only while initial checkAuth is running
    if (status === 'loading') {
        return <div style={styles.container}><p>Checking authentication...</p></div>;
    }


    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Get Started</h1>
            <p style={styles.description}>
                Sign in or start the onboarding process.
            </p>
            <div style={styles.buttonContainer}>
                 <button 
                    onClick={handleStartOnboarding}
                    style={{...styles.button}}
                >
                    Start Onboarding
                </button>
                <button 
                    onClick={handleGoogleSignIn}
                    style={{...styles.button, ...styles.googleButton}}
                >
                    Sign In with Google
                </button>
            </div>
        </div>
    );
}

// Minimal styles
const styles: { [key: string]: React.CSSProperties } = {
    container: { padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' },
    title: { marginBottom: '10px' },
    description: { marginBottom: '30px', color: '#6c757d' },
    buttonContainer: { display: 'flex', gap: '20px', justifyContent: 'center' },
    button: { padding: '12px 25px', fontSize: '16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' },
    googleButton: { backgroundColor: '#4285F4', color: 'white', borderColor: '#4285F4' }
};

export default AuthPage; 