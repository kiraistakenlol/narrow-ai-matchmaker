import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../state/hooks';
import {
    signOutUser,
    selectAuthUser,
    selectAuthStatus,
    selectAuthError,
    selectIsOnboarded,
    signInWithGoogle,
} from '../state/slices/authSlice';
import SigninOrOnboardView from '../components/SigninOrOnboardView';
import apiClient from '../lib/apiClient';
import { OnboardingSessionDto } from '@narrow-ai-matchmaker/common';
import StartOnboardingView from '../components/StartOnboardingView';

function HomePage() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectAuthUser);
    const authStatus = useAppSelector(selectAuthStatus);
    const authError = useAppSelector(selectAuthError);
    const isOnboarded = useAppSelector(selectIsOnboarded);

    const [onboardingSession, setOnboardingSession] = useState<OnboardingSessionDto | null>(null);
    const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [showOnboardingInput, setShowOnboardingInput] = useState<boolean>(false);

    useEffect(() => {
        setOnboardingSession(null);
        setSessionError(null);
        setShowOnboardingInput(false);
        setIsLoadingSession(false);

        if (user && authStatus === 'succeeded') {
            const fetchOnboardingSession = async () => {
                setIsLoadingSession(true);
                try {
                    const response = await apiClient.get<OnboardingSessionDto>('/onboarding');
                    setOnboardingSession(response.data);
                    setShowOnboardingInput(false);
                } catch (err: any) {
                    if (err.response?.status === 404) {
                        console.log('No onboarding session found (404), showing input view.');
                        setOnboardingSession(null);
                        setSessionError(null);
                        setShowOnboardingInput(true);
                    } else {
                        const apiErrorMessage = err.response?.data?.message || err.message || 'Failed to fetch onboarding session';
                        setSessionError(apiErrorMessage);
                        setShowOnboardingInput(false);
                        console.error('Error fetching onboarding session:', err);
                    }
                } finally {
                    setIsLoadingSession(false);
                }
            };
            fetchOnboardingSession();
        }
    }, [user, authStatus]);

    const handleSignOut = () => {
        dispatch(signOutUser());
    };

    const handleStartOnboarding = () => {
        console.log('HomePage: Start Onboarding Button Clicked (Now handled by StartOnboardingView)');
    };

    const handleSignIn = () => {
        dispatch(signInWithGoogle());
    };

    const handleOnboardingComplete = () => {
        setShowOnboardingInput(false);
        console.log("Onboarding reported complete, hiding input view.");
    };

    const handleOnboardingError = (errorMsg: string) => {
        console.error("Onboarding failed:", errorMsg);
    };

    if (authStatus === 'loading') {
        return <div style={styles.container}><p>Loading home...</p></div>;
    }

    if (!user) {
        return (
            <div style={styles.containerCenter}>
                <SigninOrOnboardView
                    title="Welcome!"
                    description="Please sign in to continue."
                    showSignIn={true}
                    onSignInWithGoogle={handleSignIn}
                />
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Home / Dashboard</h1>

            <div>
                <p>Welcome, {user.email} (User Internal ID: {user.id})</p>
                <button onClick={handleSignOut} style={styles.signOutButton}>
                    Sign Out
                </button>
            </div>

            <div style={{ marginTop: '20px' }}>
                <h3>Onboarding Status Check:</h3>
                {isLoadingSession && <p>Loading session info...</p>}
                
                {onboardingSession && (
                    <>
                        <p>Existing onboarding session found:</p>
                        <pre style={styles.jsonOutput}>
                            {JSON.stringify(onboardingSession, null, 2)}
                        </pre>
                    </>
                )}

                {showOnboardingInput && (
                    <div style={styles.onboardingPrompt}>
                         <p>Complete your profile by recording an introduction:</p>
                         <StartOnboardingView 
                             hints={["Introduce yourself", "Mention your interests or goals"]}
                             onOnboardingComplete={handleOnboardingComplete}
                             onOnboardingError={handleOnboardingError}
                        />
                    </div>
                )}

                {sessionError && !showOnboardingInput && (
                    <p style={styles.errorText}>Error loading onboarding status: {sessionError}</p>
                )}
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: { padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' },
    containerCenter: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
        padding: '20px',
        fontFamily: 'sans-serif'
    },
    title: { marginBottom: '10px' },
    errorText: { color: 'red', marginTop: '10px' },
    jsonOutput: { backgroundColor: '#eee', padding: '10px', margin: '10px 0', whiteSpace: 'pre-wrap', borderRadius: '4px' },
    signOutButton: { marginTop: '15px', padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' },
    onboardingPrompt: {
        marginTop: '30px',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
    }
};

export default HomePage; 