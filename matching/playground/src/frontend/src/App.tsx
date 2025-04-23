import React from 'react'; // Keep React import for JSX
import {
  Routes,
  Route,
  NavLink
} from 'react-router-dom';
import './App.css';
import BaseAudiencePage from './pages/ProfilesPage';
import EmbeddingPage from './pages/EmbeddingPage';
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
        >
          Base Audience
        </NavLink>
        <NavLink 
          to="/embed"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Embedding
        </NavLink>
        <NavLink 
          to="/scenarios"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Scenarios
        </NavLink>
      </nav>

      <div className="content">
        <Routes>
          <Route path="/" element={<BaseAudiencePage />} />
          <Route path="/embed" element={<EmbeddingPage />} />
          <Route path="/search/:profileId" element={<SearchPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App; 