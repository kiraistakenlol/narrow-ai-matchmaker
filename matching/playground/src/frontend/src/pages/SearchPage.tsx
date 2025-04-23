import React from 'react';
import { useParams } from 'react-router-dom';
import ProfileDetail from '../components/ProfileDetail';

function SearchPage() {
  const { profileId } = useParams<{ profileId: string }>();

  if (!profileId) {
    return <div>Error: Profile ID is missing.</div>;
  }

  return (
    <ProfileDetail profileId={profileId} />
  );
}

export default SearchPage; 