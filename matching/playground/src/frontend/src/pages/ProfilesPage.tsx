import React, {useEffect, useState} from 'react';
import ProfileList from '../components/ProfileList';
import {Profile} from 'narrow-ai-matchmaker-common';

function BaseAudiencePage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Define fetchBaseSet outside useEffect so it can be passed as a prop
    const fetchBaseSet = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:3000/test-data/get-base-set');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: Profile[] = await response.json();
            setProfiles(data);
        } catch (err) {
            console.error('Error fetching base set profiles:', err);
            setError(err instanceof Error ? err.message : 'Failed to load profiles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBaseSet(); // Call it on initial mount
    }, []); // Empty dependency array ensures it runs only once initially

    return (
        <ProfileList
            profiles={profiles}
            loading={loading}
            error={error}
            onGenerationComplete={fetchBaseSet} // Pass fetchBaseSet as the callback
        />
    );
}

export default BaseAudiencePage; 