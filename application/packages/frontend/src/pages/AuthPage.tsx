import React, {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAppSelector} from '../state/hooks';
import {selectAuthStatus} from '../state/slices/authSlice';
import AuthPrompt from '../components/AuthPrompt';
import StartOnboardingButton from '../components/StartOnboardingButton';
import SignInWithGoogleButton from '../components/SignInWithGoogleButton';

function AuthPage() {
    const navigate = useNavigate();
    const status = useAppSelector(selectAuthStatus);
    const isLoading = status === 'loading';

    useEffect(() => {
        if (status === 'succeeded') {
            navigate('/');
        }
    }, [status, navigate]);

    const handleStartOnboarding = () => {
        console.log('AuthPage: Start Onboarding Clicked');
        // TODO: Implement actual navigation or state change for onboarding
    };

    if (isLoading) {
        return <div style={styles.container}><p>Checking authentication...</p></div>;
    }

    return (
        <div style={styles.container}>
            <AuthPrompt
                title="Get Started"
                description="Sign in or start the onboarding process."
            >
                <StartOnboardingButton disabled={isLoading}/>
                <SignInWithGoogleButton disabled={isLoading}/>
            </AuthPrompt>
        </div>
    );
}

// Only need container styles now
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: 'sans-serif'
    },
};

export default AuthPage; 