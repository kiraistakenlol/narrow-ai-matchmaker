import React, { useState } from 'react';
import { FullProfile } from '../../../../common/src/types/full-profile.types';
import ProfileCard from './ProfileCard';

interface ProfileListProps {
  profiles: FullProfile[];
  loading: boolean;
  error: string | null;
  onGenerationComplete: () => void;
}

export default function ProfileList({ profiles, loading, error, onGenerationComplete }: ProfileListProps) {
  // Base Set Generation State
  const [generationCount, setGenerationCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Base Audience Embedding State
  const [collectionName, setCollectionName] = useState('profiles'); // Collection name state
  const [isEmbeddingBase, setIsEmbeddingBase] = useState(false);
  const [embedBaseError, setEmbedBaseError] = useState<string | null>(null);
  const [embedBaseSuccess, setEmbedBaseSuccess] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const response = await fetch(
        `http://localhost:3000/test-data/generate-base-set?count=${generationCount}`,
        {
          method: 'POST',
          headers: { 'Accept': 'application/json' }
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }
      onGenerationComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error generating base set:', err);
      setGenerationError(`Failed: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler for embedding base audience
  const handleEmbedBaseAudience = async () => {
    if (!collectionName) {
        setEmbedBaseError('Collection Name is required.');
        return;
    }
    setIsEmbeddingBase(true);
    setEmbedBaseError(null);
    setEmbedBaseSuccess(null);
    try {
        const response = await fetch(
            `http://localhost:3000/embed/base-audience`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ collectionName })
            }
        );
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        setEmbedBaseSuccess(result.message || `Successfully embedded base audience.`);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('Error embedding base audience:', err);
        setEmbedBaseError(`Failed: ${message}`);
    } finally {
        setIsEmbeddingBase(false);
    }
  };

  if (loading) return <div className="loading" style={{ padding: '20px' }}>Loading profiles...</div>;
  if (error) return <div className="error" style={{ padding: '20px', color: 'red' }}>Error loading profiles: {error}</div>;

  return (
    <div className="profile-list" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      {/* Header Section */}
      <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
        {/* Title and Collection Input */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
           <h2 style={{ margin: 0 }}>Base Audience</h2>
           <div>
              <label htmlFor="collectionNameInput" style={{ marginRight: '10px', fontSize: '0.9em' }}>
                Collection:
              </label>
              <input
                id="collectionNameInput"
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="e.g., profiles"
                style={{ padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
                disabled={isGenerating || isEmbeddingBase} // Disable if any action is running
              />
           </div>
        </div>
        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Generate Controls */}
          <div>
            <label style={{ marginRight: '5px', fontSize: '0.9em' }}>Generate:</label>
            <input 
              type="number"
              value={generationCount}
              onChange={(e) => setGenerationCount(parseInt(e.target.value, 10) || 1)}
              min="1"
              max="500"
              disabled={isGenerating || isEmbeddingBase}
              style={{ width: '60px', marginRight: '5px', padding: '5px' }}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || isEmbeddingBase || generationCount <= 0 || generationCount > 500}
              style={{ padding: '5px 10px' }}
            >
              {isGenerating ? 'Generating...' : 'Generate Base Audience'}
            </button>
            {generationError && <span style={{ color: 'red', marginLeft: '10px', fontSize: '0.8em' }}>{generationError}</span>}
          </div>
          {/* Embed Base Controls */}
          <div>
             <button
                onClick={handleEmbedBaseAudience}
                disabled={isEmbeddingBase || isGenerating || !collectionName}
                style={{ padding: '5px 10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
                title="Clear collection and embed current base_audience.json"
              >
                {isEmbeddingBase ? 'Embedding...' : 'Embed Base Audience'}
              </button>
              {embedBaseError && <span style={{ color: 'red', marginLeft: '10px', fontSize: '0.8em' }}>{embedBaseError}</span>}
              {embedBaseSuccess && <span style={{ color: 'green', marginLeft: '10px', fontSize: '0.8em' }}>{embedBaseSuccess}</span>}
          </div>
        </div>
      </div>
      {profiles.length === 0 && !loading ? (
        <p>No profiles found. Use the button above to generate some.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </ul>
      )}
    </div>
  );
} 