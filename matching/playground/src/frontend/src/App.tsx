import React from 'react'; // Keep React import for JSX
import {NavLink, Route, Routes} from 'react-router-dom';
import './App.css';
import BaseAudiencePage from './pages/ProfilesPage';
import ScenariosPage from './pages/ScenariosPage';
import EmbeddingPage from './pages/EmbeddingPage';

function App() {
    return (
        <div className="app-container">
            <h1>Narrow AI matchmaker playground</h1>

            <nav className="tabs">
                <NavLink
                    to="/"
                    className={({isActive}) => isActive ? 'active' : ''}
                    style={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        padding: '0.8em 1.5em'
                    }}
                >
                    Base Audience
                </NavLink>
                <NavLink
                    to="/scenarios"
                    className={({isActive}) => isActive ? 'active' : ''}
                    style={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        padding: '0.8em 1.5em',
                    }}
                >
                    Scenarios
                </NavLink>
                <NavLink
                    to="/embedding"
                    className={({isActive}) => isActive ? 'active' : ''}
                    style={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        padding: '0.8em 1.5em',
                    }}
                >
                    Embedding
                </NavLink>
            </nav>

            <div className="content">
                <Routes>
                    <Route path="/" element={<BaseAudiencePage/>}/>
                    <Route path="/scenarios" element={<ScenariosPage/>}/>
                    <Route path="/embedding" element={<EmbeddingPage/>}/>
                </Routes>
            </div>
        </div>
    );
}

export default App; 