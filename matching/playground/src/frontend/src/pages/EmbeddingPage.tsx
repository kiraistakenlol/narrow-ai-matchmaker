import React from 'react';
import EmbeddingPanel from '../components/EmbeddingPanel';
import BaseSetGenerator from '../components/BaseSetGenerator';
import '../App.css';

function EmbeddingPage() {
  return (
    <div className="embedding-page">
      <EmbeddingPanel />
      <hr className="separator" />
      <BaseSetGenerator />
    </div>
  );
}

export default EmbeddingPage; 