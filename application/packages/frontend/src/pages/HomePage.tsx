import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { UserDto } from '@narrow-ai-matchmaker/common';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

function HomePage() {
    const [userData, setUserData] = useState<UserDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuthAndFetchUser = async () => {
            try {
                const session = await fetchAuthSession({ forceRefresh: true });
                const idToken = session.tokens?.idToken?.toString();
                if (!idToken) throw new Error('ID token not found after authentication.');

                const response = await fetch(`${API_BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${idToken}` },
                });

                if (!response.ok) {
                    // Handle cases where user exists in Cognito but not backend?
                    if (response.status === 404) {
                         console.error('User authenticated but not found in backend.');
                         // Decide recovery path: maybe sign out, maybe force onboarding?
                         // For now, treat as auth failure for redirect
                         throw new Error('User not found in backend.');
                    }
                    throw new Error(`Failed to fetch user data: ${response.status}`);
                }
                const data: UserDto = await response.json();
                setUserData(data);
            } catch (err) {
                console.error('Auth check/fetch failed on Home Page:', err);
                navigate('/signin'); // Redirect to signin if not authenticated or fetch fails
            } finally {
                setIsLoading(false);
            }
        };
        checkAuthAndFetchUser();
    }, [navigate]);

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/signin');
        } catch (err) {
            console.error('Error signing out: ', err);
            setError('Failed to sign out.');
        }
    };

    if (isLoading) {
        return <div style={styles.container}><p>Loading home...</p></div>;
    }

    // Error display primarily for sign-out issues, as fetch errors redirect.
    if (error) {
         return <div style={styles.container}><p style={styles.errorText}>{error}</p></div>;
    }

    // Render user data if loading is done and userData is available
    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Home / Dashboard</h1>
            <p>Your User Data:</p>
            {userData ? (
                <pre style={styles.jsonOutput}>
                    {JSON.stringify(userData, null, 2)}
                </pre>
            ) : (
                <p>Could not load user data.</p> // Should ideally be loading or redirected
            )}
            <button onClick={handleSignOut} style={styles.signOutButton}>
                Sign Out
            </button>
        </div>
    );
}

// Minimal styles (can be shared later)
const styles: { [key: string]: React.CSSProperties } = {
    container: { padding: '20px', fontFamily: 'sans-serif' },
    title: { marginBottom: '10px' },
    errorText: { color: 'red' },
    jsonOutput: { backgroundColor: '#eee', padding: '10px', margin: '10px 0', whiteSpace: 'pre-wrap' },
    signOutButton: { marginTop: '20px', padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' },
};

export default HomePage; 