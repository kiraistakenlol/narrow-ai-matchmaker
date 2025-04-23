import React, { useState, useEffect } from 'react';

// Assuming types might be shared eventually, but define locally for now
interface MatchScenario {
  id: string;
  scenario: string;
  match_description: string;
}

type MatchScenarioCategories = Record<string, MatchScenario[]>;

// Type for storing generation status per scenario
interface GenerationStatus {
  isLoading: boolean;
  error: string | null;
  filePath: string | null;
  message: string | null;
}

function ScenariosPage() {
  const [scenarios, setScenarios] = useState<MatchScenarioCategories | null>(null);
  const [loadingScenarios, setLoadingScenarios] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // State to track generation status for each scenario ID
  const [generationStatus, setGenerationStatus] = useState<Record<string, GenerationStatus>>({});

  useEffect(() => {
    const fetchScenarios = async () => {
      setLoadingScenarios(true);
      setFetchError(null);
      try {
        // The vite proxy config handles redirecting /api to the backend
        // Use the explicit backend URL as requested
        const response = await fetch('http://localhost:3000/test-data/scenarios'); 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: MatchScenarioCategories = await response.json();
        setScenarios(data);
        // Initialize generation status for each scenario
        const initialStatus: Record<string, GenerationStatus> = {};
        Object.values(data).flat().forEach(scenario => {
          initialStatus[scenario.id] = { isLoading: false, error: null, filePath: null, message: null };
        });
        setGenerationStatus(initialStatus);
      } catch (e: any) {
        setFetchError(`Failed to load scenarios: ${e.message}`);
        console.error("Fetch error:", e);
      } finally {
        setLoadingScenarios(false);
      }
    };

    fetchScenarios();
  }, []); // Empty dependency array means this runs once on mount

  const handleGenerateBundle = async (scenarioId: string) => {
    // Set loading state for this specific scenario
    setGenerationStatus(prev => ({ 
      ...prev, 
      [scenarioId]: { ...prev[scenarioId], isLoading: true, error: null, message: null, filePath: null }
    }));

    try {
      const response = await fetch(`http://localhost:3000/test-data/generate-scenario/${scenarioId}`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      // Update status on success
      setGenerationStatus(prev => ({
        ...prev,
        [scenarioId]: { 
          ...prev[scenarioId], 
          isLoading: false, 
          error: null, 
          message: result.message, 
          filePath: result.filePath 
        }
      }));

    } catch (e: any) {
      console.error(`Error generating bundle for ${scenarioId}:`, e);
      // Update status on error
      setGenerationStatus(prev => ({
        ...prev,
        [scenarioId]: { 
          ...prev[scenarioId], 
          isLoading: false, 
          error: `Generation failed: ${e.message}`,
          message: null,
          filePath: null 
        }
      }));
    } 
  };

  return (
    <div className="scenarios-page">
      <h2>Match Scenarios</h2>

      {loadingScenarios && <p>Loading scenarios...</p>}
      {fetchError && <p className="error">{fetchError}</p>}

      {scenarios && Object.entries(scenarios).map(([category, scenarioList]) => (
        <div key={category} className="scenario-category">
          <h3>{category}</h3>
          <ul>
            {scenarioList.map(scenario => {
              const status = generationStatus[scenario.id] || { isLoading: false, error: null, filePath: null, message: null }; // Default status
              return (
                <li key={scenario.id} className="scenario-item">
                  <div className="scenario-info">
                    <strong>{scenario.id}: {scenario.scenario}</strong>
                    <p>{scenario.match_description}</p>
                  </div>
                  <div className="scenario-actions">
                    <button 
                      onClick={() => handleGenerateBundle(scenario.id)}
                      disabled={status.isLoading}
                      className="generate-button"
                    >
                      {status.isLoading ? 'Generating...' : 'Generate Profiles'}
                    </button>
                    {status.error && <p className="error-message">{status.error}</p>}
                    {status.message && <p className="success-message">{status.message}</p>}
                    {/* Optionally display filePath: status.filePath */} 
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {!loadingScenarios && !fetchError && !scenarios && <p>No scenarios found.</p>}
    </div>
  );
}

export default ScenariosPage; 