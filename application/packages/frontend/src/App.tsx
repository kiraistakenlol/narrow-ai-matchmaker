import React from 'react';

function App() {
    // Vite exposes env variables starting with VITE_ on import.meta.env
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Hello World - Frontend</h1>
            <p>API Base URL from .env: <strong>{apiBaseUrl || 'Not Set'}</strong></p>
        </div>
    );
}

export default App;
