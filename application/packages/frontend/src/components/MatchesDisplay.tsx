import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MatchDto } from '@narrow-ai-matchmaker/common';
import { fetchMyMatches } from '../lib/apiClient';

const MatchesDisplay: React.FC = () => {
    const [matches, setMatches] = useState<MatchDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadMatches = async () => {
            try {
                setLoading(true);
                setError(null);
                const matchesData = await fetchMyMatches();
                setMatches(matchesData);
            } catch (err) {
                console.error('Error loading matches:', err);
                setError('Failed to load your matches. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        loadMatches();
    }, []);

    if (loading) {
        return <div style={styles.container}><p>Loading matches...</p></div>;
    }

    if (error) {
        return <div style={styles.container}><p style={styles.errorText}>{error}</p></div>;
    }

    if (matches.length === 0) {
        return <div style={styles.container}><p>No matches found at the moment.</p></div>;
    }

    return (
        <div style={styles.container}>
            <h3 style={styles.header}>Your Top Matches</h3>
            <div style={styles.scrollContainer}>
                {matches.map((match) => (
                    <Link to={`/mmt/${match.userId}`} key={match.userId} style={styles.matchCardLink}>
                        <div style={styles.matchCard}>
                            <h4 style={styles.matchName}>{match.name}</h4>
                            <p style={styles.matchReason}>{match.reason}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        margin: '20px 0',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
    },
    header: {
        fontSize: '1.2em',
        fontWeight: 600,
        color: '#343a40',
        marginBottom: '15px',
        borderBottom: '1px solid #ced4da',
        paddingBottom: '10px',
    },
    scrollContainer: {
        display: 'flex',
        overflowX: 'auto',
        gap: '15px',
        paddingBottom: '10px', // For scrollbar visibility if needed
    },
    matchCardLink: {
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        minWidth: '250px',
        maxWidth: '300px',
    },
    matchCard: {
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        padding: '15px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        border: '1px solid #e9ecef',
        height: '100%', // Ensure cards in a row take similar height if content varies
        transition: 'transform 0.2s ease-in-out, boxShadow 0.2s ease-in-out',
    },
    matchName: {
        fontSize: '1.1em',
        fontWeight: 500,
        margin: '0 0 8px 0',
        color: '#007bff',
    },
    matchReason: {
        fontSize: '0.9em',
        color: '#495057',
        margin: '0',
        lineHeight: '1.4',
    },
    errorText: {
        color: '#dc3545',
    }
};

export default MatchesDisplay; 