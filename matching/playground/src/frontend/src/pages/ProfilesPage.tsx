import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileList from '../components/ProfileList';

function ProfilesPage() {
  const navigate = useNavigate();

  const handleProfileSelect = (profileId: string) => {
    navigate(`/search/${profileId}`);
  };

  return (
    <ProfileList onSelectProfile={handleProfileSelect} />
  );
}

export default ProfilesPage; 