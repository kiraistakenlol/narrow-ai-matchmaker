import {BrowserRouter as Router, Navigate, Route, Routes,} from 'react-router-dom';
import { useAuthListener } from './hooks/useAuthListener';
import HomePage from './pages/HomePage';
import EventPage from './pages/EventPage';

function App() {
    useAuthListener();

    return (
        <Router>
            <Routes>
                {/* Root route - Home (handles auth check internally) */}
                <Route path="/" element={<HomePage />} />

                {/* Event detail page */}
                <Route path="/event/:id" element={<EventPage />} />

                {/* Catch-all route: Redirects any unmatched path to Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
