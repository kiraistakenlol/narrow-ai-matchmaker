import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileList from '../components/ProfileList';
import { FullProfile } from '../../../common/src/types/full-profile.types';

function BaseAudiencePage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<FullProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    fetchProfiles();
  }, []);

  const handleProfileSelect = (profileId: string) => {
    navigate(`/search/${profileId}`);
  };

  return (
    <ProfileList 
      profiles={profiles} 
      onSelectProfile={handleProfileSelect} 
      loading={loading}
      error={error}
    />
  );
}

export default BaseAudiencePage; 