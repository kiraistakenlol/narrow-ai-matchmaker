import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EventDto } from '@narrow-ai-matchmaker/common';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

function EventPage() {
    const { id } = useParams<{ id: string }>(); // Get event ID from route params
    const [eventData, setEventData] = useState<EventDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                const data: EventDto = await response.json();
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
                    <pre style={styles.jsonOutput}>
                        {JSON.stringify(eventData, null, 2)}
                    </pre>
                </>
            ) : (
                <p>Event data not available.</p> // Should show error or loading instead usually
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
};

export default EventPage; 