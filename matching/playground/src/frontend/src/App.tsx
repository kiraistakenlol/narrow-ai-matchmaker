import React, { useState, useEffect } from 'react'
import { Profile } from 'narrow-ai-matchmaker-common'
import './App.css'
import ProfileList from './components/ProfileList'
import ProfileDetail from './components/ProfileDetail'

function App() {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profiles' | 'embed' | 'search'>('profiles')

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfileId(profileId)
    setActiveTab('search')
  }

  return (
    <div className="app-container">
      <h1>Vector Database Playground</h1>
      
      <div className="tabs">
        <button 
          className={activeTab === 'profiles' ? 'active' : ''} 
          onClick={() => setActiveTab('profiles')}
        >
          Profiles
        </button>
        <button 
          className={activeTab === 'embed' ? 'active' : ''} 
          onClick={() => setActiveTab('embed')}
        >
          Embedding
        </button>
        {selectedProfileId && (
          <button 
            className={activeTab === 'search' ? 'active' : ''} 
            onClick={() => setActiveTab('search')}
          >
            Similar Profiles
          </button>
        )}
      </div>

      <div className="content">
        {activeTab === 'profiles' && (
          <ProfileList onSelectProfile={handleProfileSelect} />
        )}
        {activeTab === 'embed' && (
          <div className="card">
            <h2>Embedding Profiles</h2>
            <EmbeddingPanel />
          </div>
        )}
        {activeTab === 'search' && selectedProfileId && (
          <ProfileDetail profileId={selectedProfileId} />
        )}
      </div>
    </div>
  )
}

function EmbeddingPanel() {
  const [collectionName, setCollectionName] = useState('profiles')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [singleProfileId, setSingleProfileId] = useState('')
  const [embedMode, setEmbedMode] = useState<'single' | 'all'>('single')
  const [showEmbedConfirmation, setShowEmbedConfirmation] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profilesError, setProfilesError] = useState('')

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await fetch('http://localhost:3000/profiles')
        const data = await response.json()
        
        if (data.profiles) {
          setAllProfiles(data.profiles)
          if (data.profiles.length > 0) {
            setSingleProfileId(data.profiles[0].user_id)
          }
        } else {
          setProfilesError('Invalid response format')
        }
      } catch (error) {
        console.error('Error fetching profiles:', error)
        setProfilesError('Failed to load profiles')
      } finally {
        setProfilesLoading(false)
      }
    }

    fetchProfiles()
  }, [])

  const handleEmbedAll = async () => {
    if (!showEmbedConfirmation) {
      setShowEmbedConfirmation(true)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:3000/embed/all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collectionName }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error embedding profiles:', error)
      setResult({ success: false, message: `Error: ${error.message}` })
    } finally {
      setLoading(false)
      setShowEmbedConfirmation(false)
    }
  }

  const handleEmbedSingle = async () => {
    if (!singleProfileId.trim()) {
      setResult({ success: false, message: 'Please select a profile ID' })
      return
    }

    setLoading(true)
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
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error embedding profile:', error)
      setResult({ success: false, message: `Error: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCollection = async () => {
    if (!showDeleteConfirmation) {
      setShowDeleteConfirmation(true)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`http://localhost:3000/embed/collection/${collectionName}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error deleting collection:', error)
      setResult({ success: false, message: `Error: ${error.message}` })
    } finally {
      setLoading(false)
      setShowDeleteConfirmation(false)
    }
  }

  const cancelConfirmation = () => {
    setShowEmbedConfirmation(false)
    setShowDeleteConfirmation(false)
  }

  if (profilesLoading) return <div className="loading">Loading profiles...</div>
  if (profilesError) return <div className="error">{profilesError}</div>

  return (
    <div>
      <div className="embed-mode-selector">
        <button 
          className={embedMode === 'single' ? 'active' : ''} 
          onClick={() => {
            setEmbedMode('single')
            cancelConfirmation()
          }}
        >
          Single Profile
        </button>
        <button 
          className={embedMode === 'all' ? 'active' : ''} 
          onClick={() => {
            setEmbedMode('all')
            cancelConfirmation()
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
            disabled={showEmbedConfirmation || showDeleteConfirmation}
          />
        </label>
      </div>
      
      {embedMode === 'single' ? (
        <div className="form-group">
          <label>
            Profile ID:
            <select
              value={singleProfileId}
              onChange={(e) => setSingleProfileId(e.target.value)}
              className="profile-select"
              disabled={showEmbedConfirmation || showDeleteConfirmation}
            >
              {allProfiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.id}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : showEmbedConfirmation ? (
        <div className="confirmation-box">
          <p>Are you sure you want to embed all {allProfiles.length} profiles?</p>
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
      ) : null}
      
      {embedMode === 'single' && !showEmbedConfirmation && !showDeleteConfirmation && (
        <button 
          onClick={handleEmbedSingle} 
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Embed Single Profile'}
        </button>
      )}
      
      {embedMode === 'all' && !showEmbedConfirmation && !showDeleteConfirmation && (
        <button 
          onClick={handleEmbedAll} 
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Embed All Profiles'}
        </button>
      )}
      
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          <h3>Result:</h3>
          <p>{result.message}</p>
          {result.success && (
            <p>
              Collection: {result.collectionName}
              {result.profileId && <span>, Profile: {result.profileId}</span>}
              {result.pointId && <span>, Point ID: {result.pointId}</span>}
            </p>
          )}
        </div>
      )}

      <hr className="separator" />

      {/* Delete Collection Section */}
      <div className="delete-section">
        <h3>Danger Zone: Delete Collection</h3>
        {!showDeleteConfirmation ? (
          <button 
            onClick={handleDeleteCollection} 
            disabled={loading || !collectionName.trim()} 
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
  )
}

export default App 