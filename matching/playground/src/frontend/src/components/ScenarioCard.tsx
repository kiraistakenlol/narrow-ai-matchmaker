import React from 'react';

// Assuming types might be shared eventually, but define locally for now
// Mirroring types from ScenariosPage for consistency
interface MatchScenario {
    id: string;
    scenario: string;
    match_description: string;
}

interface GenerationStatus {
    isLoading: boolean;
    error: string | null;
    filePath: string | null;
    message: string | null;
}

// Added type for embedding status
interface EmbeddingStatus {
    isLoading: boolean;
    error: string | null;
    message: string | null;
}

interface ScenarioCardProps {
    scenario: MatchScenario;
    generationStatus: GenerationStatus; // Renamed from status for clarity
    embeddingStatus: EmbeddingStatus;  // Added embedding status prop
    onGenerate: (scenarioId: string) => void;
    onEmbed: (scenarioId: string) => void; // Added callback for embedding
}

// Basic styling for the card (can be moved to CSS)
const cardStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    marginBottom: '15px',
    padding: '15px',
    borderRadius: '5px',
    background: '#f9f9f9',
    color: '#333',
    fontFamily: 'sans-serif',
    display: 'flex',       // Use flexbox for layout
    justifyContent: 'space-between', // Separate info and actions
    alignItems: 'flex-start', // Align items at the top
    gap: '15px',           // Add gap between info and actions
};

const infoStyle: React.CSSProperties = {
    flexGrow: 1, // Allow info section to take available space
};

const actionsStyle: React.CSSProperties = {
    flexShrink: 0, // Prevent actions from shrinking
    textAlign: 'right', // Align button and messages to the right
    minWidth: '150px', // Ensure enough space for button and messages
};

const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    border: 'none',
    background: '#28a745', // Green color for generate
    color: 'white',
    borderRadius: '4px',
    marginBottom: '5px', // Space below button
};

const errorStyle: React.CSSProperties = {
    color: 'red',
    fontSize: '0.85em',
    margin: '5px 0 0 0',
};

const successStyle: React.CSSProperties = {
    color: 'green',
    fontSize: '0.85em',
    margin: '5px 0 0 0',
};

const embedButtonStyle: React.CSSProperties = {
    ...buttonStyle, // Inherit base button style
    background: '#007bff', // Blue color for embed
    marginLeft: '10px', // Space between buttons
};

export default function ScenarioCard({ 
    scenario, 
    generationStatus, 
    embeddingStatus, 
    onGenerate, 
    onEmbed 
}: ScenarioCardProps) { // Updated props destructuring
    return (
        <li style={cardStyle}>
            {/* Scenario Information Section */}
            <div style={infoStyle}>
                <strong style={{ fontSize: '1.1em' }}>{scenario.id}: {scenario.scenario}</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: '#555' }}>
                    {scenario.match_description}
                </p>
            </div>

            {/* Scenario Actions Section */}
            <div style={actionsStyle}>
                {/* Generate Button and Status */}
                <div>
                    <button 
                        onClick={() => onGenerate(scenario.id)}
                        disabled={generationStatus.isLoading || embeddingStatus.isLoading} // Disable if either is loading
                        style={buttonStyle}
                        title="Generate scenario profile JSON file"
                    >
                        {generationStatus.isLoading ? 'Generating...' : 'Generate Profiles'}
                    </button>
                    {generationStatus.error && <p style={errorStyle}>{generationStatus.error}</p>}
                    {generationStatus.message && <p style={successStyle}>{generationStatus.message}</p>}
                </div>

                {/* Embed Button and Status */}
                <div style={{ marginTop: '10px' }}> {/* Add margin for spacing */}
                    <button 
                        onClick={() => onEmbed(scenario.id)}
                        disabled={generationStatus.isLoading || embeddingStatus.isLoading} // Disable if either is loading
                        style={embedButtonStyle}
                        title="Embed generated scenario profiles into vector DB"
                    >
                        {embeddingStatus.isLoading ? 'Embedding...' : 'Embed Profiles'}
                    </button>
                    {embeddingStatus.error && <p style={errorStyle}>{embeddingStatus.error}</p>}
                    {embeddingStatus.message && <p style={successStyle}>{embeddingStatus.message}</p>}
                </div>
            </div>
        </li>
    );
} 