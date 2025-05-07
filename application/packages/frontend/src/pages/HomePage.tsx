import React, { } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { selectAuthStatus, selectAuthUser, signOutUser, checkAuth } from '../state/slices/authSlice';
import SigninOrOnboardView from '../components/SigninOrOnboardView';
import OnboardingInputView from '../components/OnboardingInputView';
import { selectFullOnboardingState, selectOnboardingSession } from '../state/slices/onboardingSlice';
import { OnboardingStatus } from '@narrow-ai-matchmaker/common';
import UserProfileSummaryView from '../components/UserProfileSummaryView';
import { Link } from 'react-router-dom';
import MatchesDisplay from '../components/MatchesDisplay';

function HomePage() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectAuthUser);
    const authStatus = useAppSelector(selectAuthStatus);

    const onboardingSession = useAppSelector(selectOnboardingSession);
    const { initialStateLoaded } = useAppSelector(selectFullOnboardingState);

    const handleSignOut = () => {
        dispatch(signOutUser());
    };

    const handleOnboardingComplete = () => {
        console.log("HomePage: Onboarding process finished. Re-checking auth...");
        dispatch(checkAuth());
    };

    if (authStatus === 'loading' && !user) {
        return <div style={styles.container}><p>Authenticating...</p></div>;
    }

    if (!initialStateLoaded) {
        return <div></div>;
    }

    if (!user) {
        const onboardingCompleted = onboardingSession?.status === OnboardingStatus.COMPLETED;
        console.log("HomePage: Onboarding completed:", onboardingCompleted);
        return (
            <div style={styles.containerCenter}>
                <SigninOrOnboardView
                    title="Welcome!"
                    description={onboardingCompleted ?
                        "You've completed onboarding, now it's time to sign up." :
                        "Please sign in or create an account to continue."}
                    showSignIn={true}
                    showOnboarding={!onboardingCompleted}
                    onOnboardingComplete={handleOnboardingComplete}
                />
                {authStatus === 'failed' && (
                    <p style={styles.errorText}>Authentication Error: {useAppSelector(state => state.auth.error)}</p>
                )}
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Dashboard</h1>

            <div style={styles.userInfoContainer}>
                <span style={styles.userEmail}>{user.email}</span>
                <Link to="/mmt/me" style={styles.profileLinkAdjacent}>View My Profile</Link>
            </div>

            {authStatus === 'failed' && (
                <p style={styles.errorText}>Error: {useAppSelector(state => state.auth.error)}</p>
            )}

            {user && user.profile && (
                <div style={{ marginTop: '20px' }}>
                    <UserProfileSummaryView profileData={user.profile} />
                </div>
            )}

            {!user.onboardingComplete && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Onboarding</h3>
                    <div style={styles.onboardingPrompt}>
                        <OnboardingInputView
                            onOnboardingComplete={handleOnboardingComplete}
                        />
                    </div>
                </div>
            )}

            {/* Display Matches */}
            {user && <MatchesDisplay />}
            
            <button onClick={handleSignOut} style={{ ...styles.signOutButton, marginTop: '30px' }}>
                Sign Out
            </button>
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
    jsonOutput: {
        backgroundColor: '#eee',
        padding: '10px',
        margin: '10px 0',
        whiteSpace: 'pre-wrap',
        borderRadius: '4px'
    },
    signOutButton: {
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
    },
    userInfoContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #dee2e6'
    },
    userEmail: {
        fontWeight: '500',
        color: '#343a40'
    },
    profileLink: {
        color: '#007bff',
        textDecoration: 'none',
    },
    profileLinkAdjacent: {
        color: '#007bff',
        textDecoration: 'none',
        fontSize: '0.9em'
    }
};

export default HomePage; 