import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileList from '../components/ProfileList';
import { FullProfile } from '../../../common/src/types/full-profile.types';

function BaseAudiencePage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<FullProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Define fetchProfiles outside useEffect so it can be passed as a prop
  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/test-data/get-base-set');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: FullProfile[] = await response.json();
      setProfiles(data);
    } catch (err) {
      console.error('Error fetching base set profiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles(); // Call it on initial mount
  }, []); // Empty dependency array ensures it runs only once initially

  const handleProfileSelect = (profileId: string) => {
    navigate(`/search/${profileId}`);
  };

  return (
    <ProfileList 
      profiles={profiles} 
      loading={loading}
      error={error}
      onGenerationComplete={fetchProfiles} // Pass fetchProfiles as the callback
    />
  );
}

export default BaseAudiencePage; 