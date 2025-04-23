import React from 'react';
import EmbeddingPanel from '../components/EmbeddingPanel';
// Remove BaseSetGenerator import
// import BaseSetGenerator from '../components/BaseSetGenerator'; 
import '../App.css';

function EmbeddingPage() {
  return (
    <div className="embedding-page">
      <EmbeddingPanel />
      {/* Remove BaseSetGenerator usage */}
      {/* <hr className="separator" /> */}
      {/* <BaseSetGenerator /> */}
    </div>
  );
}

export default EmbeddingPage; 