import React from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
} from 'react-router-dom';

import SignInPage from './pages/SignInPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

function App() {
    return (
        <Router>
            <Routes>
                {/* Route for the Sign In page */}
                <Route path="/" element={<SignInPage />} />
                
                {/* Route for the Cognito callback */}
                <Route path="/auth/callback" element={<AuthCallbackPage />} />

                {/* TODO: Add other routes here (e.g., onboarding, main dashboard) */}
                {/* Example:
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/dashboard" element={<DashboardPage />} /> 
                */}
            </Routes>
        </Router>
    );
}

export default App;
