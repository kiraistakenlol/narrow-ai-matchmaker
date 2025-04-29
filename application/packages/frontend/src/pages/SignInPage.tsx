import React, { useEffect, useState } from 'react';
import { signInWithRedirect, fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils'; // Correct import for Hub
import { UserDto } from '@narrow-ai-matchmaker/common'; // Import common DTO

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'; 

function SignInPage() {
    const [authState, setAuthState] = useState<'loading' | 'signedOut' | 'signedIn' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    // Store the full UserDto from /users/me
    const [currentUserData, setCurrentUserData] = useState<UserDto | null>(null); 

    useEffect(() => {
        const checkAuthState = async () => {
            try {
                await fetchAuthSession({ forceRefresh: true }); // Check and potentially refresh
                setAuthState('loading'); // Show loading while fetching /users/me
                await fetchUserData(); 
            } catch (err) {
                setAuthState('signedOut');
            }
        };

        checkAuthState();

        const hubListenerCancel = Hub.listen('auth', async ({ payload }) => {
            switch (payload.event) {
                case 'signedIn':
                case 'signInWithRedirect':
                    setAuthState('loading'); // Show loading while syncing/fetching
                    // Sync with backend first, then fetch user data
                    const syncSuccess = await handleBackendLogin();
                    if (syncSuccess) {
                        await fetchUserData();
                    }
                    break;
                case 'signedOut':
                    setAuthState('signedOut');
                    setCurrentUserData(null);
                    setError(null);
                    break;
                case 'signInWithRedirect_failure':
                    setError('Sign in failed. Please try again.');
                    setAuthState('error');
                    break;
            }
        });

        return () => hubListenerCancel();
    }, []);

    // Renamed from handleBackendSync for clarity - only does the POST /auth
    // Returns true on success, false on failure
    const handleBackendLogin = async (): Promise<boolean> => {
        setError(null);
       try {
           const session = await fetchAuthSession({ forceRefresh: true });
           const idToken = session.tokens?.idToken?.toString();

           if (!idToken) throw new Error('ID token not found in session.');

           const response = await fetch(`${API_BASE_URL}/auth`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ id_token: idToken }),
           });

           if (!response.ok) {
               const errorBody = await response.text();               
               throw new Error(`Backend login failed: ${response.status}. ${errorBody}`);
           }

           const returnedUser: UserDto = await response.json(); // We get user info here too
           return true; // Indicate success

       } catch (err) {
           setError(err instanceof Error ? err.message : 'An unexpected error occurred during sign in finalization.');
           setAuthState('error');
           return false; // Indicate failure
       }
   };

    // New function to fetch user data from GET /users/me
    const fetchUserData = async () => {
        setError(null);
        try {
            const session = await fetchAuthSession({ forceRefresh: true });
            const idToken = session.tokens?.idToken?.toString();
            if (!idToken) throw new Error('ID token not found for fetching user data.');

            const response = await fetch(`${API_BASE_URL}/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}` // IMPORTANT: Assuming AuthGuard needs this
                },
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to fetch user data: ${response.status}. ${errorBody}`);
            }

            const userData: UserDto = await response.json();
            setCurrentUserData(userData);
            setAuthState('signedIn'); // Final signed in state

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load user profile.');
            setAuthState('error');
        }
    };

    const handleGoogleSignIn = async () => {
        setAuthState('loading'); // Show loading state
        setError(null);
        try {
            // Use signInWithRedirect for the Hosted UI flow
            await signInWithRedirect({ provider: 'Google' });
             // Redirect happens here, Hub listener will handle the result on return
        } catch (error) {
            setError('Failed to start the sign-in process.');
            setAuthState('error');
        }
    };

    // Add Sign Out handler
    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            setError('Failed to sign out.');
            // Might want to force state update if Hub listener fails
            setAuthState('error'); 
        }
    };

    // Render different UI based on authState
    if (authState === 'loading') {
        return <div style={styles.container}><p>Loading...</p></div>;
    }

    if (authState === 'signedIn' && currentUserData) {
        return (
            <div style={styles.container}>
                <h1 style={styles.title}>Welcome!</h1>
                <pre style={styles.jsonOutput}> {/* Render as JSON */} 
                    {JSON.stringify(currentUserData, null, 2)}
                </pre>
                {error && <p style={styles.errorText}>Error: {error}</p>}
                <button onClick={handleSignOut} style={styles.signOutButton}>
                    Sign Out
                </button>
            </div>
        );
    } 
    
    // Show loading state between POST /auth and GET /users/me if not covered by main loading state
    if (authState === 'signedIn' && !currentUserData) {
         return <div style={styles.container}><p>Loading user data...</p></div>;
    }

    // Render Sign In button only if signedOut or error state
    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Sign In</h1>
            <p style={styles.description}>
                Sign in or create an account to get started.
            </p>
            {error && <p style={styles.errorText}>Error: {error}</p>}
            <button
                onClick={handleGoogleSignIn}
                style={styles.googleButton}
            >
                Sign in with Google
            </button>
        </div>
    );
}

// Basic styles (add style for sign out button)
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        backgroundColor: '#f8f9fa'
    },
    title: {
        marginBottom: '10px',
        color: '#343a40'
    },
    description: {
        marginBottom: '30px',
        color: '#6c757d'
    },
    googleButton: {
        padding: '12px 25px',
        fontSize: '16px',
        backgroundColor: '#4285F4', // Google Blue
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'background-color 0.3s ease',
    },
    // Add a distinct style for the sign out button
    signOutButton: {
        marginTop: '20px',
        padding: '10px 20px',
        fontSize: '14px',
        backgroundColor: '#dc3545', // Red for sign out
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'background-color 0.3s ease'
    },
     errorText: {
        color: 'red',
        marginTop: '10px',
        marginBottom: '10px',
    },
    jsonOutput: { // Style for the JSON output
        backgroundColor: '#e9ecef',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        padding: '15px',
        textAlign: 'left',
        maxWidth: '80%',
        overflowX: 'auto', // Handle long lines
        margin: '20px 0',
        whiteSpace: 'pre-wrap' // Wrap long lines within the pre block
    }
};


export default SignInPage; 