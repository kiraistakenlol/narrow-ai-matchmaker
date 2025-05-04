import React, {useEffect, useRef, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../hooks/hooks';
import {selectAuthStatus, selectAuthUser, signInWithGoogle, signOutUser, selectAuthState} from '../state/slices/authSlice';
import SigninOrOnboardView from '../components/SigninOrOnboardView';
import apiClient from '../lib/apiClient';
import {OnboardingSessionDto} from '@narrow-ai-matchmaker/common';
import OnboardingInputView from '../components/OnboardingInputView';

function HomePage() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectAuthUser);
    const authStatus = useAppSelector(selectAuthStatus);

    const [onboardingSession, setOnboardingSession] = useState<OnboardingSessionDto | null | undefined>(undefined);
    const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
    const [error, setError] = useState<string | undefined>(undefined);
    const [showOnboardingInput, setShowOnboardingInput] = useState<boolean>(false);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setOnboardingSession(undefined);
        setError(undefined);
        setShowOnboardingInput(false);
        setIsLoadingSession(false);
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        if (user && authStatus === 'succeeded') {
            const fetchSession = async () => {
                setIsLoadingSession(true);
                setError(undefined);
                let fetchedSession: OnboardingSessionDto | null = null;
                let fetchError: string | undefined = undefined;

                try {
                    const response = await apiClient.get<OnboardingSessionDto | null>('/onboarding');
                    fetchedSession = response.data;
                    console.log('HomePage: fetchedSession', fetchedSession);
                    if (fetchedSession === null) {
                        console.log('No onboarding session found (API returned null data).');
                    }
                    setOnboardingSession(fetchedSession);

                } catch (err: any) {
                    fetchError = `Failed to fetch onboarding session: ${err.response?.data?.message || err.message}`;
                    console.error(fetchError);
                } finally {
                    setShowOnboardingInput(fetchedSession === null || (!!fetchedSession && fetchedSession.status === 'NEEDS_CLARIFICATION'));
                    setError(fetchError);
                    setIsLoadingSession(false);
                }
            };
            fetchSession();
        }
    }, [user, authStatus]);

    useEffect(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        const needsPolling = onboardingSession && (onboardingSession.status !== "COMPLETED" && onboardingSession.status !== "NEEDS_CLARIFICATION");
        const shouldShowInput = onboardingSession === null || (onboardingSession?.status === "NEEDS_CLARIFICATION");

        if (showOnboardingInput !== shouldShowInput) {
            setShowOnboardingInput(shouldShowInput);
        }

        if (needsPolling) {
            console.log(`Starting polling for session ${onboardingSession?.id}, status: ${onboardingSession?.status}`);
            const poll = async () => {
                try {
                    console.log(`Polling status for ${onboardingSession?.id}...`);
                    const response = await apiClient.get<OnboardingSessionDto | null>('/onboarding');
                    const currentSessionData = response.data;
                    if (JSON.stringify(currentSessionData) !== JSON.stringify(onboardingSession)) {
                        setOnboardingSession(currentSessionData);
                        if (currentSessionData?.status === 'COMPLETED' || currentSessionData?.status === 'NEEDS_CLARIFICATION') {
                            if (pollingIntervalRef.current) {
                                console.log(`Polling detected terminal state (${currentSessionData?.status}), stopping.`);
                                clearInterval(pollingIntervalRef.current);
                                pollingIntervalRef.current = null;
                            }
                        }
                    }
                    setError(undefined);
                } catch (err: any) {
                    const apiErrorMessage = err.response?.data?.message || err.message || 'Failed to poll onboarding status';
                    setError(`Polling error: ${apiErrorMessage}`);
                    console.error('Polling error:', err);
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                }
            };
            pollingIntervalRef.current = setInterval(poll, 5000);

            return () => {
                if (pollingIntervalRef.current) {
                    console.log("Clearing polling interval due to effect cleanup.");
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            };
        }
        return undefined;
    }, [onboardingSession, showOnboardingInput]);

    const handleSignOut = () => {
        dispatch(signOutUser());
    };

    const handleSignIn = () => {
    };

    const handleOnboardingComplete = () => {
        console.log("Onboarding reported complete by input view.");
        const fetchSessionNow = async () => {
            setIsLoadingSession(true);
            try {
                const response = await apiClient.get<OnboardingSessionDto | null>('/onboarding');
                const sessionData = response.data;
                setOnboardingSession(sessionData);
                setError(undefined);
            } catch (err: any) {
                const sessionError = `Failed to re-fetch session after onboarding: ${err.response?.data?.message || err.message}`;
                console.error(sessionError, err);
                setError(sessionError);
            } finally {
                setIsLoadingSession(false);
            }
        }
        fetchSessionNow();
    };

    const handleOnboardingError = (errorMsg: string) => {
        console.error("Onboarding input view reported error:", errorMsg);
        setError(`Onboarding attempt failed: ${errorMsg}`);
    };

    if (authStatus === 'loading') {
        return <div style={styles.container}><p>Authenticating...</p></div>;
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
                {authStatus === 'failed' && error && (
                    <p style={styles.errorText}>Authentication Error: {error}</p>
                )}
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Home / Dashboard</h1>

            <div>
                <p>Welcome, {user.email} (Internal ID: {user.id})</p>
                <button onClick={handleSignOut} style={styles.signOutButton}>
                    Sign Out
                </button>
            </div>

            {error && (
                <p style={styles.errorText}>Error: {error}</p>
            )}

            {user && (
                <div style={{marginTop: '20px'}}>
                    <h3>User Object:</h3>
                    <pre style={styles.jsonOutput}>
                        {JSON.stringify(user, null, 2)}
                    </pre>
                </div>
            )}

            <div style={{marginTop: '20px'}}>
                <h3>Onboarding</h3>
                {isLoadingSession && <p>Loading session info...</p>}

                {!isLoadingSession && onboardingSession && (
                    <>
                        <p>Current Session State:</p>
                        <pre style={styles.jsonOutput}>
                            {JSON.stringify(onboardingSession, null, 2)}
                        </pre>
                    </>
                )}

                {!isLoadingSession && showOnboardingInput && (
                    <div style={styles.onboardingPrompt}>
                        <OnboardingInputView
                            onboardingId={onboardingSession?.id}
                            eventId={onboardingSession?.eventId ?? undefined}
                            hints={["Introduce yourself", "Mention your interests or goals"]}
                            onOnboardingComplete={handleOnboardingComplete}
                            onOnboardingError={handleOnboardingError}
                        />
                    </div>
                )}

                {!isLoadingSession && onboardingSession === null && !showOnboardingInput && <p>No onboarding needed.</p>}
                {!isLoadingSession && onboardingSession && onboardingSession.status === "COMPLETED" && !showOnboardingInput && (
                    <p style={{color: 'green', fontWeight: 'bold'}}>Onboarding Completed!</p>
                )}
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto'},
    containerCenter: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
        padding: '20px',
        fontFamily: 'sans-serif'
    },
    title: {marginBottom: '10px'},
    errorText: {color: 'red', marginTop: '10px'},
    jsonOutput: {
        backgroundColor: '#eee',
        padding: '10px',
        margin: '10px 0',
        whiteSpace: 'pre-wrap',
        borderRadius: '4px'
    },
    signOutButton: {
        marginTop: '15px',
        padding: '8px 15px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '4px'
    },
    onboardingPrompt: {
        marginTop: '30px',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
    }
};

export default HomePage; 