import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {JoinedEventDto} from '@narrow-ai-matchmaker/common';
import {useAppSelector} from '../state/hooks';
import {selectIsAuthenticated} from '../state/slices/authSlice';
import WelcomContainer from '../components/AuthPrompt';
import StartOnboardingButton from '../components/StartOnboardingButton';
import SignInWithGoogleButton from '../components/SignInWithGoogleButton';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

function EventPage() {
    const {id: eventId} = useParams<{ id: string }>();
    const [eventDto, setEventDto] = useState<JoinedEventDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const navigate = useNavigate();
    const location = useLocation();

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
                const response = await fetch(`${API_BASE_URL}/events/${eventId}`);

                if (response.status === 404) {
                    throw new Error('Event not found.');
                }
                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`Failed to fetch event: ${response.status}. ${errorBody}`);
                }
                const data: JoinedEventDto = await response.json();
                setEventDto(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [eventId, isAuthenticated]);

    const handleNavigateToSignIn = () => {
        navigate(`/signin?redirect=${encodeURIComponent(location.pathname)}`);
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

                    {isAuthenticated ? (
                        <div>
                            {eventDto.participationId ? (
                                // authenticated and joined
                                <div>
                                    <p style={styles.joinedStatus}>✅ JOINED</p>
                                </div>
                            ) : (
                                // authenticated but no joined
                                <div>
                                    <p style={styles.joinedStatus}>❌ NOT JOINED</p>
                                    <WelcomContainer
                                        title="Join the Event"
                                        description={`Complete Onboarding to join ${eventDto.name}`}
                                    >
                                        <StartOnboardingButton disabled={false}/>
                                    </WelcomContainer>
                                </div>
                            )}
                        </div>

                    ) : (
                        <div>

                            <WelcomContainer
                                title="Join the Event"
                                description={`Sign in or create an account to join ${eventDto.name}.`}
                            >
                                <StartOnboardingButton disabled={false}/>
                                <SignInWithGoogleButton disabled={false}/>
                            </WelcomContainer>
                        </div>
                    )

                    }
                    <pre style={styles.jsonOutput}>
                        {JSON.stringify(eventDto, null, 2)}
                    </pre>
                </>
            ) : (
                <p>Event data not available.</p>
            )}
        </div>
    );
}

// Minimal styles
const styles: { [key: string]: React.CSSProperties } = {
    container: {padding: '20px', fontFamily: 'sans-serif'},
    title: {marginBottom: '10px'},
    errorText: {color: 'red'},
    jsonOutput: {backgroundColor: '#eee', padding: '10px', margin: '10px 0', whiteSpace: 'pre-wrap'},
    statusBox: {
        border: '1px solid #ccc',
        padding: '10px',
        margin: '15px 0',
        borderRadius: '4px',
        backgroundColor: '#f8f9fa'
    },
    joinedStatus: {
        color: 'green',
        fontWeight: 'bold'
    },
    notJoinedStatus: {
        color: 'orange',
        fontWeight: 'bold'
    },
    promptBox: {
        border: '1px solid #ccc',
        padding: '15px',
        margin: '15px 0',
        borderRadius: '4px',
        backgroundColor: '#f8f9fa',
        textAlign: 'center'
    }
};

export default EventPage; 