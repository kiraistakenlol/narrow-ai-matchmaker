import React, {} from 'react';
import {useAppDispatch, useAppSelector} from '../hooks/hooks';
import {selectAuthStatus, selectAuthUser, signOutUser, checkAuth} from '../state/slices/authSlice';
import SigninOrOnboardView from '../components/SigninOrOnboardView';
import OnboardingInputView from '../components/OnboardingInputView';

function HomePage() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectAuthUser);
    const authStatus = useAppSelector(selectAuthStatus);

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

    if (!user) {
        return (
            <div style={styles.containerCenter}>
                <SigninOrOnboardView
                    title="Welcome!"
                    description="Please sign in or create an account to continue."
                    showSignIn={true}
                    showOnboarding={true}
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
            <h1 style={styles.title}>Home / Dashboard</h1>

            <div>
                <p>Welcome, {user.email} (Internal ID: {user.id})</p>
                <button onClick={handleSignOut} style={styles.signOutButton}>
                    Sign Out
                </button>
            </div>

            {authStatus === 'failed' && (
                <p style={styles.errorText}>Error: {useAppSelector(state => state.auth.error)}</p>
            )}

            {user && (
                <div style={{marginTop: '20px'}}>
                    <h3>User Object:</h3>
                    <pre style={styles.jsonOutput}>
                        {JSON.stringify(user, null, 2)}
                    </pre>
                </div>
            )}

            {!user.onboardingComplete && (
                <div style={{marginTop: '20px'}}>
                    <h3>Onboarding</h3>
                    <div style={styles.onboardingPrompt}>
                        <OnboardingInputView
                            onOnboardingComplete={handleOnboardingComplete}
                        />
                    </div>
                </div>
            )}

            {!!user.onboardingComplete && (
                <div style={{marginTop: '20px'}}>
                    <p style={{color: 'green', fontWeight: 'bold'}}>Onboarding Completed!</p>
                </div>
            )}
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