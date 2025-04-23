import React, { useState, useEffect } from 'react';
import { Profile } from 'narrow-ai-matchmaker-common';
import './EmbeddingPanel.css'; // We'll create this file later for specific styles if needed

interface EmbeddingPanelProps {
  // Add any props if needed in the future
}

function EmbeddingPanel({}: EmbeddingPanelProps) {
  const [collectionName, setCollectionName] = useState('profiles');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [singleProfileId, setSingleProfileId] = useState('');
  const [embedMode, setEmbedMode] = useState<'single' | 'all'>('single');
  const [showEmbedConfirmation, setShowEmbedConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      setProfilesLoading(true);
      setProfilesError('');
      try {
        const response = await fetch('http://localhost:3000/profiles');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.profiles && Array.isArray(data.profiles)) {
          setAllProfiles(data.profiles);
          if (data.profiles.length > 0) {
            setSingleProfileId(data.profiles[0].id); // Use id field
          }
        } else {
          console.error('Invalid response format:', data);
          setProfilesError('Invalid response format received from server.');
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        setProfilesError(`Failed to load profiles: ${message}`);
      } finally {
        setProfilesLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const handleEmbedAll = async () => {
    if (!showEmbedConfirmation) {
      setShowEmbedConfirmation(true);
      return;
    }

    setLoading(true);
    setResult(null); // Clear previous results
    try {
      const response = await fetch('http://localhost:3000/embed/all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collectionName }),
      });
       if (!response.ok) {
         const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
         throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown error'}`);
       }
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error embedding profiles:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setResult({ success: false, message: `Error: ${message}` });
    } finally {
      setLoading(false);
      setShowEmbedConfirmation(false);
    }
  };

  const handleEmbedSingle = async () => {
    if (!singleProfileId.trim()) {
      setResult({ success: false, message: 'Please select a profile ID' });
      return;
    }

    setLoading(true);
    setResult(null); // Clear previous results
    try {
      const response = await fetch('http://localhost:3000/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          profileId: singleProfileId, 
          collectionName 
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error embedding profile:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setResult({ success: false, message: `Error: ${message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!showDeleteConfirmation) {
      setShowDeleteConfirmation(true);
      return;
    }

    setLoading(true);
    setResult(null); // Clear previous results
    try {
      const response = await fetch(`http://localhost:3000/embed/collection/${collectionName}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
         throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown error'}`);
       }
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error deleting collection:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setResult({ success: false, message: `Error: ${message}` });
    } finally {
      setLoading(false);
      setShowDeleteConfirmation(false);
    }
  };

  const cancelConfirmation = () => {
    setShowEmbedConfirmation(false);
    setShowDeleteConfirmation(false);
  };

  if (profilesLoading) return <div className="loading">Loading profiles...</div>;
  if (profilesError) return <div className="error">{profilesError}</div>;

  return (
    <div className="card">
      <h2>Embedding Profiles</h2>
      <div className="embed-mode-selector">
        <button 
          className={embedMode === 'single' ? 'active' : ''} 
          onClick={() => {
            setEmbedMode('single');
            cancelConfirmation();
          }}
        >
          Single Profile
        </button>
        <button 
          className={embedMode === 'all' ? 'active' : ''} 
          onClick={() => {
            setEmbedMode('all');
            cancelConfirmation();
          }}
        >
          All Profiles
        </button>
      </div>

      <div className="form-group">
        <label>
          Collection Name:
          <input
            type="text"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            disabled={loading || showEmbedConfirmation || showDeleteConfirmation}
          />
        </label>
      </div>
      
      {embedMode === 'single' && (
        <div className="form-group">
          <label>
            Profile ID:
            <select
              value={singleProfileId}
              onChange={(e) => setSingleProfileId(e.target.value)}
              className="profile-select"
              disabled={loading || showEmbedConfirmation || showDeleteConfirmation}
            >
              <option value="" disabled>Select a profile</option>
              {allProfiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.id} {/* Display profile ID, or maybe name if available */}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {embedMode === 'all' && showEmbedConfirmation && (
        <div className="confirmation-box">
          <p>Are you sure you want to embed all {allProfiles.length} profiles into collection '{collectionName}'?</p>
          <p>This operation might take some time.</p>
          <div className="confirmation-actions">
            <button onClick={handleEmbedAll} disabled={loading} className="confirm-button">
              {loading ? 'Processing...' : 'Yes, Embed All'}
            </button>
            <button onClick={cancelConfirmation} disabled={loading} className="cancel-button">
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {embedMode === 'single' && !showEmbedConfirmation && !showDeleteConfirmation && (
        <button 
          onClick={handleEmbedSingle} 
          disabled={loading || !singleProfileId.trim()}
          className="action-button"
        >
          {loading ? 'Processing...' : 'Embed Single Profile'}
        </button>
      )}
      
      {embedMode === 'all' && !showEmbedConfirmation && !showDeleteConfirmation && (
        <button 
          onClick={handleEmbedAll} 
          disabled={loading || allProfiles.length === 0}
          className="action-button"
        >
          {loading ? 'Processing...' : 'Embed All Profiles'}
        </button>
      )}
      
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          <h4>Result:</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <hr className="separator" />

      {/* Delete Collection Section */}
      <div className="delete-section">
        <h4>Danger Zone: Delete Collection</h4>
        {!showDeleteConfirmation ? (
          <button 
            onClick={handleDeleteCollection} 
            disabled={loading || !collectionName.trim() || showEmbedConfirmation} 
            className="delete-button"
          >
            Delete Collection '{collectionName}'
          </button>
        ) : (
          <div className="confirmation-box confirmation-box-danger">
            <p><strong>Are you sure you want to delete the collection '{collectionName}'?</strong></p>
            <p>This action cannot be undone!</p>
            <div className="confirmation-actions">
              <button 
                onClick={handleDeleteCollection} 
                disabled={loading} 
                className="delete-button confirm-delete-button"
              >
                {loading ? 'Deleting...' : 'Yes, Delete Collection'}
              </button>
              <button onClick={cancelConfirmation} disabled={loading} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmbeddingPanel; 