import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../state/hooks';
import { 
    signOutUser, 
    selectAuthUser, 
    selectAuthStatus, 
    selectAuthError, 
    selectIsOnboarded,
} from '../state/slices/authSlice';
import StartOnboardingButton from '../components/StartOnboardingButton';

function HomePage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const user = useAppSelector(selectAuthUser);
    const status = useAppSelector(selectAuthStatus);
    const error = useAppSelector(selectAuthError);
    const isOnboarded = useAppSelector(selectIsOnboarded);

    useEffect(() => {
        if (status === 'failed') {
            navigate('/signin');
        }
    }, [status, navigate]);

    const handleSignOut = () => {
        dispatch(signOutUser()); 
    };

    const handleStartOnboarding = () => {
        console.log('HomePage: Start Onboarding Clicked');
        // TODO: Navigate to actual onboarding flow
    };

    if (status === 'loading' || status === 'idle') {
        return <div style={styles.container}><p>Loading home...</p></div>;
    }

    if (error && status !== 'failed') {
         return (
            <div style={styles.container}>
                <p style={styles.errorText}>Error: {error}</p>
                 <button onClick={handleSignOut} style={styles.signOutButton}>
                    Sign Out (force)
                 </button>
            </div>
         );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Home / Dashboard</h1>
            
            {user && (
                <p>Welcome, {user.email} (ID: {user.id})</p>
            )}

            {isOnboarded ? (
                <>
                    <p>Your User Data (Onboarded):</p>
                    {user ? (
                        <pre style={styles.jsonOutput}>
                            {JSON.stringify(user, null, 2)}
                        </pre>
                    ) : (
                        <p>User data not available.</p> 
                    )}
                    <button onClick={handleSignOut} style={styles.signOutButton}>
                        Sign Out
                    </button>
                </>
            ) : (
                 <div style={styles.onboardingPrompt}>
                    <p>You are signed in, but need to complete onboarding.</p>
                     <StartOnboardingButton disabled={false}/>
                     
                     <button onClick={handleSignOut} style={{...styles.signOutButton, marginLeft: '10px'}}>
                         Sign Out Instead
                    </button>
                 </div>
            )}
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: { padding: '20px', fontFamily: 'sans-serif' },
    title: { marginBottom: '10px' },
    errorText: { color: 'red' },
    jsonOutput: { backgroundColor: '#eee', padding: '10px', margin: '10px 0', whiteSpace: 'pre-wrap' },
    signOutButton: { marginTop: '20px', padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' },
    onboardingPrompt: {
        marginTop: '20px',
        padding: '20px',
        border: '1px solid #e0e0e0',
        backgroundColor: '#f9f9f9',
        borderRadius: '5px'
    }
};

export default HomePage; 