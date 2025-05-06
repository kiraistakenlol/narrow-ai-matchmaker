import { BrowserRouter as Router, Navigate, Route, Routes, } from 'react-router-dom';
import { useAuthListener } from './hooks/useAuthListener';
import HomePage from './pages/HomePage';
import EventPage from './pages/EventPage';
import DevPage from './pages/DevPage';
import UserPage from './pages/UserPage';
import { useAppDispatch } from './hooks/hooks';
import { initializeOnboarding } from './state/slices/onboardingSlice';
import { useEffect } from 'react';

function App() {
    useAuthListener();

    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(initializeOnboarding());
    }, [dispatch]);

    return (
        <Router>
            <Routes>
                {/* Root route - Home (handles auth check internally) */}
                <Route path="/" element={<HomePage />} />

                {/* Event detail page */}
                <Route path="/event/:id" element={<EventPage />} />

                {/* Developer Playground */}
                <Route path="/dev" element={<DevPage />} />

                {/* Profile page */}
                <Route path="/mmt/:userId" element={<UserPage />} />

                {/* Catch-all route: Redirects any unmatched path to Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
