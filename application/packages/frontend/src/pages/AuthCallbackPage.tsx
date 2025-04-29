import React, { useEffect, useState } from 'react';
import { Hub, HubCapsule } from 'aws-amplify/utils';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useSearchParams } from 'react-router-dom';

function AuthCallbackPage() {
    const [status, setStatus] = useState('Processing...');
    const [error, setError] = useState<string | null>(null);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        // Check for errors in URL parameters immediately
        const urlError = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (urlError) {
            console.error(`Error from redirect: ${urlError}`, errorDescription);
            setError(`Sign-in failed: ${errorDescription || urlError}. Please try again.`);
            setStatus('Sign in failed.');
            // No need to set up Hub listener if there was an immediate URL error
            return;
        }

        // If no URL error, proceed with Hub listener setup
        setStatus('Authenticating...');
        const listener = async (data: HubCapsule<string, any>) => {
            const { payload } = data;
            console.log('Auth Hub Event:', payload.event, payload.data);

            switch (payload.event) {
                case 'signInWithRedirect': // Successful sign-in after redirect
                    setStatus('Successfully signed in! Fetching session...');
                    try {
                        const session = await fetchAuthSession({ forceRefresh: true });
                        const idToken = session.tokens?.idToken?.toString();
                        console.log('ID Token:', idToken ? idToken.substring(0, 20) + '...' : 'Not found');
                        
                        // Check localStorage *after* the event confirms success
                        console.log('Checking localStorage keys after signInWithRedirect event:', Object.keys(localStorage));
                        
                        setStatus('Successfully fetched session. Tokens should be in storage.');
                        // TODO Phase 2: Send idToken to backend
                        // TODO: Redirect user based on backend response / onboarding status
                    } catch (err) {
                        console.error('Error fetching auth session:', err);
                        setError('Failed to fetch authentication session after sign in.');
                        setStatus('Error fetching session.');
                    }
                    break;
                case 'signInWithRedirect_failure': // Error during sign-in flow
                    console.error('Sign in with redirect failed:', payload.data);
                    // Attempt to access error message safely
                    const failureMsg = payload.data?.message || payload.data?.error_description || 'Unknown sign-in failure';
                    setError(`Sign in failed: ${failureMsg}. Please try again.`);
                    setStatus('Sign in failed.');
                    // TODO: Redirect user back to sign-in page
                    break;
                case 'customOAuthState_failure':
                    console.error('Custom OAuth State failure:', payload.data);
                     const stateFailureMsg = payload.data?.message || 'State mismatch';
                    setError(`An unexpected error occurred during sign in: ${stateFailureMsg}. Please try again.`);
                    setStatus('Sign in failed (state error).');
                    break;
                default:
                    console.log(`Unhandled auth event: ${payload.event}`);
                    break;
            }
        };

        const unsubscribe = Hub.listen('auth', listener);

        // Optional: Check session immediately
        fetchAuthSession().catch((err) => {
            // This is expected if the user isn't signed in yet during the redirect
            console.log('Initial session fetch failed (may be expected during redirect).'); 
        });

        return unsubscribe;
    }, [searchParams]);

    // Render UI
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            fontFamily: 'sans-serif',
            textAlign: 'center'
        }}>
            <h1>Authentication Callback</h1>
            <p>Status: {status}</p>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {!error && status === 'Authenticating...' && <p>Please wait...</p>}
            <p>Check the browser console for details.</p>
        </div>
    );
}

export default AuthCallbackPage; 