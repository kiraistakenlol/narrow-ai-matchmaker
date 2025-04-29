import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../state/hooks';
import { 
    signOutUser, 
    selectAuthUser, 
    selectAuthStatus, 
    selectAuthError, 
} from '../state/slices/authSlice';

function HomePage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const user = useAppSelector(selectAuthUser);
    const status = useAppSelector(selectAuthStatus);
    const error = useAppSelector(selectAuthError);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === 'failed') {
            navigate('/signin');
        } else if (status === 'succeeded') {
            setIsLoading(false);
        }
    }, [status, navigate]);

    const handleSignOut = () => {
        dispatch(signOutUser()); 
        // Sign out success/failure is handled by slice, 
        // which should eventually trigger a status change to 'idle' or 'failed' -> redirect
    };

    if (status === 'loading' || status === 'idle' || isLoading) {
        return <div style={styles.container}><p>Loading home...</p></div>;
    }

    // Error display primarily for sign-out errors or other non-redirecting errors
    if (error && status !== 'failed') { // Don't show error if redirecting
         return (
            <div style={styles.container}>
                <p style={styles.errorText}>Error: {error}</p>
                 <button onClick={handleSignOut} style={styles.signOutButton}>
                    Sign Out (force)
                 </button>
            </div>
         );
    }

    // Render user data only if status is succeeded
    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Home / Dashboard</h1>
            <p>Your User Data:</p>
            {user ? (
                <pre style={styles.jsonOutput}>
                    {JSON.stringify(user, null, 2)}
                </pre>
            ) : (
                <p>User data not available.</p> // Should ideally not be reachable if status === succeeded
            )}
            <button onClick={handleSignOut} style={styles.signOutButton}>
                Sign Out
            </button>
        </div>
    );
}

// Minimal styles (reuse or centralize later)
const styles: { [key: string]: React.CSSProperties } = {
    container: { padding: '20px', fontFamily: 'sans-serif' },
    title: { marginBottom: '10px' },
    errorText: { color: 'red' },
    jsonOutput: { backgroundColor: '#eee', padding: '10px', margin: '10px 0', whiteSpace: 'pre-wrap' },
    signOutButton: { marginTop: '20px', padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' },
};

export default HomePage; 