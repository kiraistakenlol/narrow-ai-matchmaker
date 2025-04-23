import React, { useState, useEffect } from 'react';
import ScenarioCard from '../components/ScenarioCard';

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

// Add EmbeddingStatus type (can be moved to a shared types file later)
interface EmbeddingStatus {
    isLoading: boolean;
    error: string | null;
    message: string | null;
}

function ScenariosPage() {
  const [scenarios, setScenarios] = useState<MatchScenarioCategories | null>(null);
  const [loadingScenarios, setLoadingScenarios] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // State to track generation status for each scenario ID
  const [generationStatus, setGenerationStatus] = useState<Record<string, GenerationStatus>>({});
  // Add state for embedding
  const [collectionName, setCollectionName] = useState<string>('profiles'); // Default collection name
  const [embeddingStatus, setEmbeddingStatus] = useState<Record<string, EmbeddingStatus>>({});

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
        // Initialize generation AND embedding status for each scenario
        const initialGenStatus: Record<string, GenerationStatus> = {};
        const initialEmbedStatus: Record<string, EmbeddingStatus> = {}; // Initialize embedding status
        Object.values(data).flat().forEach(scenario => {
          initialGenStatus[scenario.id] = { isLoading: false, error: null, filePath: null, message: null };
          initialEmbedStatus[scenario.id] = { isLoading: false, error: null, message: null }; // Initialize embedding status
        });
        setGenerationStatus(initialGenStatus);
        setEmbeddingStatus(initialEmbedStatus); // Set initial embedding status
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

  // Add handler for embedding scenario profiles
  const handleEmbedScenario = async (scenarioId: string) => {
    if (!collectionName) {
      // Optionally set a page-level error, or rely on button disable
      console.error('Collection name is required to embed.');
      // Update status to show an error message locally
      setEmbeddingStatus(prev => ({ 
          ...prev, 
          [scenarioId]: { ...prev[scenarioId], isLoading: false, error: 'Collection Name is required.', message: null }
      }));
      return;
    }

    // Set loading state for this specific scenario embedding
    setEmbeddingStatus(prev => ({ 
      ...prev, 
      [scenarioId]: { ...prev[scenarioId], isLoading: true, error: null, message: null }
    }));

    try {
      const response = await fetch(`http://localhost:3000/embed/scenario/${scenarioId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ collectionName }), // Pass collectionName from state
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      // Update status on success
      setEmbeddingStatus(prev => ({
        ...prev,
        [scenarioId]: { 
          ...prev[scenarioId], 
          isLoading: false, 
          error: null, 
          message: result.message || `Embedded ${scenarioId} successfully.`
        }
      }));

    } catch (e: any) {
      console.error(`Error embedding scenario ${scenarioId}:`, e);
      // Update status on error
      setEmbeddingStatus(prev => ({
        ...prev,
        [scenarioId]: { 
          ...prev[scenarioId], 
          isLoading: false, 
          error: `Embedding failed: ${e.message}`,
          message: null
        }
      }));
    } 
  };

  return (
    <div className="scenarios-page" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Match Scenarios</h2>

      {/* Add Collection Name Input */} 
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="collectionNameInput" style={{ marginRight: '10px', fontWeight: 'bold' }}>
          Target Collection Name:
        </label>
        <input
          id="collectionNameInput"
          type="text"
          value={collectionName}
          onChange={(e) => setCollectionName(e.target.value)}
          placeholder="e.g., profiles"
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>

      {loadingScenarios && <p>Loading scenarios...</p>}
      {fetchError && <p style={{ color: 'red' }}>{fetchError}</p>}

      {scenarios && Object.entries(scenarios).map(([category, scenarioList]) => (
        <div key={category} className="scenario-category" style={{ marginBottom: '30px' }}>
          <h3 style={{ borderBottom: '1px dashed #ccc', paddingBottom: '5px' }}>{category}</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {scenarioList.map(scenario => {
              const genStatus = generationStatus[scenario.id] || { isLoading: false, error: null, filePath: null, message: null }; 
              const embedStatus = embeddingStatus[scenario.id] || { isLoading: false, error: null, message: null }; // Get embedding status
              return (
                 <ScenarioCard 
                    key={scenario.id} 
                    scenario={scenario} 
                    generationStatus={genStatus} // Pass generation status
                    embeddingStatus={embedStatus}  // Pass embedding status
                    onGenerate={handleGenerateBundle}
                    onEmbed={handleEmbedScenario} // Pass embedding handler
                 />
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