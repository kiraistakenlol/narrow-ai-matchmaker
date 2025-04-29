import React, { useEffect, useState } from 'react';
import { signInWithRedirect, fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth'; 
import { Hub } from 'aws-amplify/utils'; // Correct import for Hub
import { UserDto } from '@narrow-ai-matchmaker/common'; // Import common DTO

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'; 

function SignInPage() {
    const [authState, setAuthState] = useState<'loading' | 'signedOut' | 'signedIn' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [backendUser, setBackendUser] = useState<UserDto | null>(null);

    useEffect(() => {
        // Check initial auth state
        const checkAuthState = async () => {
            try {
                console.log("Checking initial auth state...");
                await fetchAuthSession(); // Check if already signed in
                console.log("Session found, setting state to signedIn");
                setAuthState('signedIn');
                 // If already signed in, trigger backend sync 
                await handleBackendSync(); 
            } catch (err) {
                console.log("No session found or error fetching.", err);
                setAuthState('signedOut');
            }
        };

        checkAuthState();

        // Listen for auth events
        const hubListenerCancel = Hub.listen('auth', async ({ payload }) => {
            switch (payload.event) {
                case 'signedIn':
                case 'signInWithRedirect': // Handle successful redirect sign-in
                    console.log('Amplify Hub: User signed in via redirect.');
                    setAuthState('signedIn');
                    await handleBackendSync(); // Call backend after successful sign-in
                    break;
                case 'signedOut':
                    console.log('Amplify Hub: User signed out.');
                    setAuthState('signedOut');
                    setBackendUser(null);
                    setError(null);
                    break;
                case 'signInWithRedirect_failure':
                    console.error('Amplify Hub: Sign in failed:', payload.data);
                    setError('Sign in failed. Please try again.');
                    setAuthState('error');
                    break;
                // Add other cases as needed: tokenRefresh, autoSignIn, etc.
            }
        });

        // Cleanup listener on component unmount
        return () => {
            hubListenerCancel();
        };
    }, []); // Run only once on mount

    const handleBackendSync = async () => {
         setAuthState('loading'); // Indicate backend call is happening
         setError(null);
        try {
            console.log('Attempting to fetch auth session...');
            // Fetch the session to get the ID token
            const session = await fetchAuthSession({ forceRefresh: true }); // Force refresh might be needed after redirect
            const idToken = session.tokens?.idToken?.toString(); // Get the JWT string

            if (!idToken) {
                throw new Error('ID token not found in session.');
            }

            console.log('ID Token found, calling backend POST /auth...');
            // Corrected endpoint to match controller
            const response = await fetch(`${API_BASE_URL}/auth`, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include Authorization header if your backend protects this endpoint (it should eventually)
                    // 'Authorization': `Bearer ${idToken}` 
                },
                body: JSON.stringify({ id_token: idToken }),
            });

            if (!response.ok) {
                const errorBody = await response.text(); // Read error body for details
                console.error(`Backend sync failed: ${response.status} ${response.statusText}`, errorBody);
                throw new Error(`Backend error: ${response.status} ${response.statusText}. ${errorBody}`);
            }

            const returnedUser: UserDto = await response.json();
            console.log('Backend sync successful:', returnedUser);
            setBackendUser(returnedUser);
            setAuthState('signedIn'); // Confirm signed-in state after backend sync
            // TODO: Redirect user to the appropriate page based on onboarding status (when implemented)

        } catch (err) {
            console.error('Error during backend sync:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during sign in finalization.');
            setAuthState('error');
             // Decide if user should be signed out from Amplify if backend fails
             // await signOut();
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
            console.error('Error initiating sign in with Google:', error);
            setError('Failed to start the sign-in process.');
            setAuthState('error');
        }
    };

    // Add Sign Out handler
    const handleSignOut = async () => {
        try {
            await signOut();
            // Hub listener will automatically set authState to 'signedOut'
        } catch (error) {
            console.error('Error signing out: ', error);
            setError('Failed to sign out.');
            // Might want to force state update if Hub listener fails
            setAuthState('error'); 
        }
    };


    // Render different UI based on authState
    if (authState === 'loading') {
        return <div style={styles.container}><p>Loading...</p></div>;
    }

    if (authState === 'signedIn') {
         // Show user info and Sign Out button
        return (
            <div style={styles.container}>
                <h1 style={styles.title}>Welcome!</h1>
                {backendUser ? (
                    <p>Signed in as: {backendUser.email} (ID: {backendUser.id})</p>
                ) : (
                     // Show loading text while handleBackendSync is running after initial page load/check
                    <p>Synchronizing account...</p>
                )}
                 {error && <p style={styles.errorText}>Error: {error}</p>}
                 <button 
                    onClick={handleSignOut} 
                    style={styles.signOutButton} // Use a distinct style for sign out
                 >
                    Sign Out
                 </button>
            </div>
        );
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
             {/* Add other sign-in options if needed */}
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
    }
};


export default SignInPage; 