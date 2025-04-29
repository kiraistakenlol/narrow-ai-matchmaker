import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAuthSession, signInWithRedirect } from 'aws-amplify/auth';

function AuthPage() {
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                await fetchAuthSession({ forceRefresh: true });
                navigate('/'); // Redirect to home if already signed in
            } catch (err) {
                setIsLoading(false); // No session, stay and show options
            }
        };
        checkAuth();
    }, [navigate]);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            await signInWithRedirect({ provider: 'Google' });
        } catch (error) {
            console.error('Error initiating sign in:', error);
            setIsLoading(false);
             // TODO: Display error to user
        }
    };
    
    const handleStartOnboarding = () => {
        console.log('Start Onboarding Clicked - Navigate to onboarding flow/components here');
        // Example: navigate('/onboarding-step-1'); // Or trigger state change
        // For now, just log it.
    };

    if (isLoading) {
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

// Minimal styles (can reuse/share later)
const styles: { [key: string]: React.CSSProperties } = {
    container: { padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' },
    title: { marginBottom: '10px' },
    description: { marginBottom: '30px', color: '#6c757d' },
    buttonContainer: { display: 'flex', gap: '20px', justifyContent: 'center' },
    button: { padding: '12px 25px', fontSize: '16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' },
    googleButton: { backgroundColor: '#4285F4', color: 'white', borderColor: '#4285F4' }
};

export default AuthPage; 