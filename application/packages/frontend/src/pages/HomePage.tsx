import React from 'react';
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

function HomePage() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectAuthUser);
    const authStatus = useAppSelector(selectAuthStatus);
    const authError = useAppSelector(selectAuthError);
    const isOnboarded = useAppSelector(selectIsOnboarded);

    const handleSignOut = () => {
        dispatch(signOutUser());
    };

    const handleStartOnboarding = () => {
        console.log('HomePage: Start Onboarding Clicked');
        // TODO: Navigate to actual onboarding flow or start process
    };

    const handleSignIn = () => {
        dispatch(signInWithGoogle());
    };

    if (authStatus === 'loading') {
        return <div style={styles.container}><p>Loading home...</p></div>;
    }

    if (!user) {
        return (
            <div style={styles.containerCenter}>
                <SigninOrOnboardView
                    title="Welcome!"
                    description="Please sign in or do onboarding."
                    showSignIn={true}
                    showOnboarding={true}
                    onSignInWithGoogle={handleSignIn}
                />
               
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Home / Dashboard</h1>

            <div>
                <p>Welcome, {user.email} (ID: {user.id})</p>
                <button onClick={handleSignOut} style={styles.signOutButton}>
                    Sign Out
                </button>
            </div>

            {isOnboarded ? (
                <>
                    <p style={{ marginTop: '20px' }}>Your profile info:</p>
                    <pre style={styles.jsonOutput}>
                        {JSON.stringify(user, null, 2)}
                    </pre>
                </>
            ) : (
                <div style={styles.onboardingPrompt}>
                    <SigninOrOnboardView
                        title="Complete Your Profile"
                        description="Record a short introduction audio to complete onboarding."
                        showOnboarding={true}
                        onStartOnboarding={handleStartOnboarding}
                    />
                </div>
            )}
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
        padding: '0',
    }
};

export default HomePage; 