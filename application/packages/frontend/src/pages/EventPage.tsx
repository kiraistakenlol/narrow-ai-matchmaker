import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { JoinedEventDto } from '@narrow-ai-matchmaker/common';
import { useAppSelector, useAppDispatch } from '../state/hooks';
import {
    selectAuthUser,
    selectIsOnboarded,
    signInWithGoogle,
} from '../state/slices/authSlice';
import SigninOrOnboardView from '../components/SigninOrOnboardView';
import apiClient from '../lib/apiClient';
import { AxiosError } from 'axios';

function EventPage() {
    const { id: eventId } = useParams<{ id: string }>();
    const [eventDto, setEventDto] = useState<JoinedEventDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectAuthUser);
    const isOnboarded = useAppSelector(selectIsOnboarded);

    useEffect(() => {
        if (!eventId) {
            setError('Event ID is missing.');
            setIsLoading(false);
            return;
        }

        const fetchEvent = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await apiClient.get<JoinedEventDto>(`/events/${eventId}`);
                setEventDto(response.data);
            } catch (err) {
                let errorMessage = 'An unexpected error occurred.';
                if (err instanceof AxiosError) {
                    if (err.response?.status === 404) {
                        errorMessage = 'Event not found.';
                    } else {
                        const errorDetails = err.response?.data?.message || err.message;
                        errorMessage = `Failed to fetch event: ${errorDetails} (Status: ${err.response?.status || 'N/A'})`;
                    }
                } else if (err instanceof Error) {
                    errorMessage = err.message;
                }
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [eventId]);

    const handleSignIn = () => {
        dispatch(signInWithGoogle());
    };

    const handleStartOnboarding = () => {
        console.log('EventPage: Start Onboarding Clicked');
        // TODO: Implement onboarding start logic/navigation
    };

    if (isLoading) {
        return <div style={styles.container}><p>Loading event...</p></div>;
    }

    if (error) {
        return <div style={styles.container}><p style={styles.errorText}>Error: {error}</p></div>;
    }

    return (
        <div style={styles.container}>
            {eventDto ? (
                <>
                    <h1 style={styles.title}>Event: {eventDto.name}</h1>

                    <pre style={styles.jsonOutput}>
                        {JSON.stringify(eventDto, null, 2)}
                    </pre>

                    <div style={styles.actionBox}>
                        {!user ? (
                            <SigninOrOnboardView
                                title="Join the Event"
                                description={`Sign in or create an account to join ${eventDto.name}.`}
                                showSignIn={true}
                                showOnboarding={true}
                                onSignInWithGoogle={handleSignIn}
                            />
                        ) : !isOnboarded ? (
                            <SigninOrOnboardView
                                title="Complete Profile to Join"
                                description={`Complete your video introduction to join ${eventDto.name}.`}
                                showOnboarding={true}
                                onStartOnboarding={handleStartOnboarding}
                            />
                        ) : eventDto.participationId ? (
                            <div>
                                <p style={styles.joinedStatus}>✅ You have joined this event.</p>
                            </div>
                        ) : (
                            <div>
                                <p style={styles.notJoinedStatus}>You have not joined this event yet.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <p>Event data not available.</p>
            )}
        </div>
    );
}

// Minimal styles
const styles: { [key: string]: React.CSSProperties } = {
    container: { padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' },
    title: { marginBottom: '10px' },
    errorText: { color: 'red' },
    jsonOutput: { backgroundColor: '#f0f0f0', padding: '15px', margin: '15px 0', whiteSpace: 'pre-wrap', borderRadius: '4px', border: '1px solid #e0e0e0' },
    actionBox: {
        marginTop: '20px',
    },
    joinedStatus: {
        color: 'green',
        fontWeight: 'bold',
        fontSize: '1.1em',
        textAlign: 'center',
        padding: '15px',
        border: '1px solid #c3e6cb',
        backgroundColor: '#d4edda',
        borderRadius: '4px'
    },
    notJoinedStatus: {
        color: '#856404',
        fontWeight: 'bold',
        fontSize: '1.1em',
        textAlign: 'center',
        marginBottom: '15px'
    },
    joinButton: {
        display: 'block',
        width: 'fit-content',
        margin: '0 auto',
        padding: '10px 20px',
        fontSize: '1em',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    }
};

export default EventPage; 