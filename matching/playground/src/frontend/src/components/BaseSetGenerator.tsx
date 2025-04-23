import React, { useState } from 'react';
import './BaseSetGenerator.css'; // Optional: for specific styling

function BaseSetGenerator() {
  const [count, setCount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `http://localhost:3000/test-data/generate-base-set?count=${count}`
        , {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
          }
        });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      setSuccessMessage(`Successfully generated ${result.count} profiles. Saved to: ${result.filePath}`);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error generating base set:', err);
      setError(`Failed to generate base set: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="base-set-generator card">
      <h3>Generate Base Set Profiles</h3>
      <p>
        Generate a set of generic profiles using the backend endpoint.
        These profiles will be saved to 'matching/playground/test_cases/base_set.json'.
      </p>
      <div className="form-group">
        <label>
          Number of Profiles:
          <input 
            type="number" 
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value, 10) || 0)}
            min="1" 
            max="500" // Match backend limits
            disabled={loading}
            className="count-input"
          />
        </label>
      </div>
      <button 
        onClick={handleGenerate} 
        disabled={loading || count <= 0 || count > 500}
        className="action-button"
      >
        {loading ? 'Generating...' : 'Generate Base Set'}
      </button>

      {successMessage && (
        <div className="result success">
          <p>{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="result error">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export default BaseSetGenerator; 