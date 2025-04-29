import React from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom';

// Import pages
import HomePage from './pages/HomePage';
import EventPage from './pages/EventPage';
import AuthPage from './pages/AuthPage'; // Renamed from SignInPromptPage
// import OnboardingPage from './pages/OnboardingPage'; // Removed

function App() {
    return (
        <Router>
            <Routes>
                {/* Root route - Home (handles auth check internally) */}
                <Route path="/" element={<HomePage />} />

                {/* Event detail page */}
                <Route path="/event/:id" element={<EventPage />} />

                {/* Sign in / Onboarding prompt page */}
                <Route path="/signin" element={<AuthPage />} />

                {/* Catch-all route: Redirects any unmatched path to Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
