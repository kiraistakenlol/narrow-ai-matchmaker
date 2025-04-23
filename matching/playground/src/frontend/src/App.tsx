import React from 'react'; // Keep React import for JSX
import {
  Routes,
  Route,
  NavLink
} from 'react-router-dom';
import './App.css';
import BaseAudiencePage from './pages/ProfilesPage';
import SearchPage from './pages/SearchPage';
import ScenariosPage from './pages/ScenariosPage';

function App() {
  return (
    <div className="app-container">
      <h1>Narrow AI matchmaker playground</h1>
      
      <nav className="tabs">
        <NavLink 
          to="/"
          className={({ isActive }) => isActive ? 'active' : ''}
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
          className={({ isActive }) => isActive ? 'active' : ''}
          style={{
            fontSize: '1.1rem', 
            fontWeight: 'bold',
            padding: '0.8em 1.5em',
          }}
        >
          Scenarios
        </NavLink>
      </nav>

      <div className="content">
        <Routes>
          <Route path="/" element={<BaseAudiencePage />} />
          <Route path="/search/:profileId" element={<SearchPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App; 