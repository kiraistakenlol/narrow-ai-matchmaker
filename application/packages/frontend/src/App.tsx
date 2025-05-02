import React, { useEffect } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom';
import { Hub } from 'aws-amplify/utils';
import { useAppDispatch } from './state/hooks';
import { checkAuth } from './state/slices/authSlice';

// Import pages
import HomePage from './pages/HomePage';
import EventPage from './pages/EventPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

function App() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        // Dispatch initial auth check on app load
        dispatch(checkAuth());

        // Listen for Amplify Auth events
        const unsubscribe = Hub.listen('auth', ({ payload }) => {
            switch (payload.event) {
                case 'signedIn':
                // case 'cognitoHostedUI': // Often covered by signedIn or signInWithRedirect
                case 'signInWithRedirect': // Event after successful federated redirect
                    console.log('Amplify Hub: User signed in event detected.');
                    // Re-dispatch checkAuth AFTER sign-in events to be sure
                    dispatch(checkAuth());
                    break;
                case 'signedOut':
                     console.log('Amplify Hub: User signed out event detected.');
                    break;
                case 'signInWithRedirect_failure':
                // case 'cognitoHostedUI_failure': // Often covered by signInWithRedirect_failure
                    console.error('Amplify Hub: Sign in failed', payload.data);
                    break;
                default:
                    break;
            }
        });

        return unsubscribe;
    }, [dispatch]);

    return (
        <Router>
            <Routes>
                {/* Root route - Home (handles auth check internally) */}
                <Route path="/" element={<HomePage />} />

                {/* Event detail page */}
                <Route path="/event/:id" element={<EventPage />} />

                {/* Sign in / Onboarding prompt page REMOVED */}

                {/* Cognito Callback - Page shows loading, Hub listener triggers state update */}
                <Route path="/auth/callback" element={<AuthCallbackPage />} />

                {/* Catch-all route: Redirects any unmatched path to Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
