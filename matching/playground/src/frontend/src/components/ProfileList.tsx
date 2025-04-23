import { useState, useEffect } from 'react'
import { Profile } from 'narrow-ai-matchmaker-common'

interface ProfileListProps {
  onSelectProfile: (profileId: string) => void
}

export default function ProfileList({ onSelectProfile }: ProfileListProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await fetch('http://localhost:3000/profiles')
        const data = await response.json()
        
        if (data.profiles) {
          setProfiles(data.profiles)
        } else {
          setError('Invalid response format')
        }
      } catch (error) {
        console.error('Error fetching profiles:', error)
        setError('Failed to load profiles')
      } finally {
        setLoading(false)
      }
    }

    fetchProfiles()
  }, [])

  if (loading) return <div className="loading">Loading profiles...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="profile-list">
      <h2>Available Profiles</h2>
      {profiles.length === 0 ? (
        <p>No profiles found.</p>
      ) : (
        <ul>
          {profiles.map((profile) => (
            <li key={profile.user_id} className="profile-item">
              <div className="profile-header">
                <span className="profile-id">{profile.user_id}</span>
                <button onClick={() => onSelectProfile(profile.user_id)}>
                  View Similar
                </button>
              </div>
              <div className="profile-text">
                {profile.text.substring(0, 150)}
                {profile.text.length > 150 ? '...' : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
} 