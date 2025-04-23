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
  const [generationCount, setGenerationCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

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

  if (loading) return <div className="loading" style={{ padding: '20px' }}>Loading profiles...</div>;
  if (error) return <div className="error" style={{ padding: '20px', color: 'red' }}>Error loading profiles: {error}</div>;

  return (
    <div className="profile-list" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Base Audience</h2>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ marginRight: '5px', fontSize: '0.9em' }}>Generate:</label>
          <input 
            type="number"
            value={generationCount}
            onChange={(e) => setGenerationCount(parseInt(e.target.value, 10) || 1)}
            min="1"
            max="500"
            disabled={isGenerating}
            style={{ width: '60px', marginRight: '10px', padding: '5px' }}
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || generationCount <= 0 || generationCount > 500}
            style={{ padding: '5px 10px' }}
          >
            {isGenerating ? 'Generating...' : 'Go'}
          </button>
          {generationError && <span style={{ color: 'red', marginLeft: '10px', fontSize: '0.8em' }}>{generationError}</span>}
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