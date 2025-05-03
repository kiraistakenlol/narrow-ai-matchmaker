import React, {useEffect, useRef, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../state/hooks';
import {selectAuthStatus, selectAuthUser, signInWithGoogle, signOutUser,} from '../state/slices/authSlice';
import SigninOrOnboardView from '../components/SigninOrOnboardView';
import apiClient from '../lib/apiClient';
import {OnboardingSessionDto} from '@narrow-ai-matchmaker/common';
import OnboardingInputView from '../components/OnboardingInputView';

function HomePage() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectAuthUser);
    const authStatus = useAppSelector(selectAuthStatus);

    const [onboardingSession, setOnboardingSession] = useState<OnboardingSessionDto | null | undefined>(undefined);
    const [isLoadingOnboardingSession, setIsLoadingOnboadingSession] = useState<boolean>(false);
    const [sessionError, setSessionError] = useState<string | undefined>(undefined);
    const [showOnboardingInput, setShowOnboardingInput] = useState<boolean>(false);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setOnboardingSession(undefined);
        setSessionError(undefined);
        setShowOnboardingInput(false);
        setIsLoadingOnboadingSession(false);
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        if (user && authStatus === 'succeeded') {
            const fetchOnboardingSession = async () => {
                setIsLoadingOnboadingSession(true);
                try {
                    const response = await apiClient.get<OnboardingSessionDto>('/onboarding');
                    setOnboardingSession(response.data);
                } catch (err: any) {
                    if (err.response?.status === 404) {
                        console.log('No onboarding session found (404), user needs to start.');
                        setOnboardingSession(null);
                        setShowOnboardingInput(true);
                        setSessionError(undefined);
                    } else {
                        const apiErrorMessage = err.response?.data?.message || err.message || 'Failed to fetch onboarding session';
                        setSessionError(apiErrorMessage);
                        setOnboardingSession(undefined);
                        setShowOnboardingInput(false);
                        console.error('Error fetching onboarding session:', err);
                    }
                } finally {
                    setIsLoadingOnboadingSession(false);
                }
            };
            fetchOnboardingSession();
        }
    }, [user, authStatus]);

    useEffect(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        const needsPolling = onboardingSession && onboardingSession.status !== "COMPLETED"

        const needsInput = needsPolling;

        if (needsInput || onboardingSession === null) {
            if (needsInput) console.log(`Session status is ${onboardingSession.status}, showing input view.`);
            setShowOnboardingInput(true);
        } else {
            setShowOnboardingInput(false);
        }

        if (needsPolling) {
            console.log(`Starting polling for session ${onboardingSession?.id}, status: ${onboardingSession?.status}`);
            const poll = async () => {
                try {
                    console.log(`Polling status for ${onboardingSession?.id}...`);
                    const response = await apiClient.get<OnboardingSessionDto>('/onboarding');
                    setOnboardingSession(response.data);
                    setSessionError(undefined);
                } catch (err: any) {
                    const apiErrorMessage = err.response?.data?.message || err.message || 'Failed to poll onboarding status';
                    setSessionError(`Polling error: ${apiErrorMessage}`);
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
    }, [onboardingSession]);

    const handleSignOut = () => {
        dispatch(signOutUser());
    };

    const handleSignIn = () => {
        dispatch(signInWithGoogle());
    };

    const handleOnboardingComplete = () => {
        console.log("Onboarding reported complete by input view.");
        setShowOnboardingInput(false);
        const fetchNow = async () => {
            setIsLoadingOnboadingSession(true);
            try {
                const response = await apiClient.get<OnboardingSessionDto>('/onboarding');
                setOnboardingSession(response.data);
                setSessionError(undefined);
            } catch (err: any) {
                const apiErrorMessage = err.response?.data?.message || err.message || 'Failed to re-fetch onboarding session';
                setSessionError(apiErrorMessage);
                console.error('Error re-fetching onboarding session:', err);
            } finally {
                setIsLoadingOnboadingSession(false);
            }
        }
        fetchNow();
    };

    const handleOnboardingError = (errorMsg: string) => {
        console.error("Onboarding input view reported error:", errorMsg);
        setSessionError(`Onboarding attempt failed: ${errorMsg}`);
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
                <p>Welcome, {user.email} (Internal ID: {user.id})</p>
                <button onClick={handleSignOut} style={styles.signOutButton}>
                    Sign Out
                </button>
            </div>

            <div style={{marginTop: '20px'}}>
                {isLoadingOnboardingSession && <p>Loading session info...</p>}

                {onboardingSession && (
                    <>
                        <p>Current Session State:</p>
                        <pre style={styles.jsonOutput}>
                            {JSON.stringify(onboardingSession, null, 2)}
                        </pre>
                    </>
                )}

                {showOnboardingInput && (
                    <div style={styles.onboardingPrompt}>
                        <p>Action Required:</p>
                        <OnboardingInputView
                            onboardingId={onboardingSession?.id}
                            eventId={onboardingSession?.eventId ?? undefined}
                            hints={["Introduce yourself", "Mention your interests or goals"]}
                            onOnboardingComplete={handleOnboardingComplete}
                            onOnboardingError={handleOnboardingError}
                        />
                    </div>
                )}

                {sessionError && (
                    <p style={styles.errorText}>Error: {sessionError}</p>
                )}

                {onboardingSession === null && !showOnboardingInput && !isLoadingOnboardingSession && !sessionError && (
                    <p>No onboarding required currently.</p>
                )}

                {onboardingSession && onboardingSession.status === "COMPLETED" && !showOnboardingInput && (
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