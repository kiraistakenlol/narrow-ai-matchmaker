import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { JoinedEventDto } from '@narrow-ai-matchmaker/common';
import { useAppSelector } from '../state/hooks';
import { selectIsAuthenticated } from '../state/slices/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

function EventPage() {
    const { id } = useParams<{ id: string }>();
    const [eventData, setEventData] = useState<JoinedEventDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);

    useEffect(() => {
        if (!id) {
            setError('Event ID is missing.');
            setIsLoading(false);
            return;
        }

        const fetchEvent = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/events/${id}`);
                
                if (response.status === 404) {
                    throw new Error('Event not found.');
                }
                if (!response.ok) {
                     const errorBody = await response.text();
                    throw new Error(`Failed to fetch event: ${response.status}. ${errorBody}`);
                }
                const data: JoinedEventDto = await response.json();
                setEventData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [id]);

    if (isLoading) {
        return <div style={styles.container}><p>Loading event...</p></div>;
    }

    if (error) {
        return <div style={styles.container}><p style={styles.errorText}>Error: {error}</p></div>;
    }

    return (
        <div style={styles.container}>
            {eventData ? (
                <>
                    <h1 style={styles.title}>Event: {eventData.name}</h1>

                    {isAuthenticated && (
                        <div style={styles.statusBox}>
                            {eventData.participationId ? (
                                <p style={styles.joinedStatus}>✔️ You have joined this event.</p>
                            ) : (
                                <p style={styles.notJoinedStatus}>❌ You have not joined this event.</p>
                            )}
                        </div>
                    )}

                    <pre style={styles.jsonOutput}>
                        {JSON.stringify(eventData, null, 2)}
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
    container: { padding: '20px', fontFamily: 'sans-serif' },
    title: { marginBottom: '10px' },
    errorText: { color: 'red' },
    jsonOutput: { backgroundColor: '#eee', padding: '10px', margin: '10px 0', whiteSpace: 'pre-wrap' },
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
    }
};

export default EventPage; 