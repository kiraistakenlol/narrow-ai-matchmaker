import React from 'react'; // Keep React import for JSX
import {
  Routes,
  Route,
  NavLink
} from 'react-router-dom';
import './App.css';
import ProfilesPage from './pages/ProfilesPage';
import EmbeddingPage from './pages/EmbeddingPage';
import SearchPage from './pages/SearchPage';

function App() {
  return (
    <div className="app-container">
      <h1>Vector Database Playground</h1>
      
      <nav className="tabs">
        <NavLink 
          to="/"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Profiles
        </NavLink>
        <NavLink 
          to="/embed"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Embedding
        </NavLink>
      </nav>

      <div className="content">
        <Routes>
          <Route path="/" element={<ProfilesPage />} />
          <Route path="/embed" element={<EmbeddingPage />} />
          <Route path="/search/:profileId" element={<SearchPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App; 