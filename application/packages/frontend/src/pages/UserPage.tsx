import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppSelector } from '../hooks/hooks';
import { selectAuthUser } from '../state/slices/authSlice';
import UserProfileView from '../components/UserProfileView';
import { fetchUserProfile } from '../lib/apiClient';
import { ProfileData } from '@narrow-ai-matchmaker/common';

const UserPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const currentUser = useAppSelector(selectAuthUser);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const isOwnProfile = currentUser?.id === userId || userId === 'me';

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // If viewing own profile with 'me' or current user's ID
                const targetUserId = userId === 'me' ? undefined : userId;
                const profileData = await fetchUserProfile(targetUserId);
                
                setProfile(profileData);
            } catch (err) {
                console.error('Error loading profile:', err);
                setError('Failed to load user profile. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        
        loadProfile();
    }, [userId, currentUser?.id]);

    if (loading) {
        return <div style={styles.container}>Loading profile...</div>;
    }

    if (error) {
        return <div style={styles.container}>
            <div style={styles.error}>{error}</div>
        </div>;
    }

    if (!profile) {
        return <div style={styles.container}>
            <div style={styles.error}>Profile not found</div>
        </div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1>{isOwnProfile ? 'My Profile' : 'User Profile'}</h1>
            </div>
            <UserProfileView profileData={profile} />
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '20px',
        maxWidth: '1000px',
        margin: '0 auto'
    },
    header: {
        marginBottom: '20px',
        borderBottom: '1px solid #eaeaea',
        paddingBottom: '10px'
    },
    error: {
        color: '#e53935',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#ffebee',
        borderRadius: '4px'
    }
};

export default UserPage; 