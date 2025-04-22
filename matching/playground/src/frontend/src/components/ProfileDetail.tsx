import { useState, useEffect } from 'react'
import { Profile } from 'narrow-ai-matchmaker-common'

interface ProfileDetailProps {
  profileId: string
}

interface SimilarProfile {
  id: string
  score: number
  payload: {
    user_id: string
    input_text: string
  }
}

export default function ProfileDetail({ profileId }: ProfileDetailProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [similarProfiles, setSimilarProfiles] = useState<SimilarProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const [collectionName, setCollectionName] = useState('profiles')
  const [limit, setLimit] = useState(5)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('http://localhost:3000/profiles')
        const data = await response.json()
        
        if (data.profiles) {
          const foundProfile = data.profiles.find((p: Profile) => p.user_id === profileId)
          if (foundProfile) {
            setProfile(foundProfile)
          } else {
            setError(`Profile with ID ${profileId} not found`)
          }
        } else {
          setError('Invalid response format')
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [profileId])

  const handleSearch = async () => {
    if (!profile) return
    
    setSearchLoading(true)
    try {
      const response = await fetch(
        `http://localhost:3000/embed/search?profileId=${profileId}&collectionName=${collectionName}&limit=${limit}`
      )
      const data = await response.json()
      
      if (data.success) {
        setSimilarProfiles(data.results)
      } else {
        console.error('Search error:', data.message)
        setError(`Search failed: ${data.message}`)
      }
    } catch (error) {
      console.error('Error searching similar profiles:', error)
      setError('Failed to search similar profiles')
    } finally {
      setSearchLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading profile...</div>
  if (error) return <div className="error">{error}</div>
  if (!profile) return <div className="error">Profile not found</div>

  return (
    <div className="profile-detail">
      <h2>Profile Detail</h2>
      
      <div className="profile-card">
        <h3>Profile ID: {profile.user_id}</h3>
        <div className="profile-content">{profile.input_text}</div>
      </div>
      
      <div className="search-controls">
        <h3>Find Similar Profiles</h3>
        <div className="form-group">
          <label>
            Collection Name:
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
            />
          </label>
        </div>
        <div className="form-group">
          <label>
            Limit:
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              min={1}
              max={50}
            />
          </label>
        </div>
        <button onClick={handleSearch} disabled={searchLoading}>
          {searchLoading ? 'Searching...' : 'Find Similar Profiles'}
        </button>
      </div>
      
      {similarProfiles.length > 0 && (
        <div className="similar-profiles">
          <h3>Similar Profiles</h3>
          <ul>
            {similarProfiles.map((similarProfile) => (
              <li key={similarProfile.id} className="similar-profile-item">
                <div className="similarity-score">
                  Similarity: {(similarProfile.score * 100).toFixed(2)}%
                </div>
                <div className="profile-header">
                  <span className="profile-id">{similarProfile.payload.user_id}</span>
                </div>
                <div className="profile-text">
                  {similarProfile.payload.input_text.substring(0, 150)}
                  {similarProfile.payload.input_text.length > 150 ? '...' : ''}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
} 