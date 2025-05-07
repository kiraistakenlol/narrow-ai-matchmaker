import React, { useState } from 'react';
import apiClient from '../lib/apiClient';
import { AxiosError } from 'axios';

function DevPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Specific state for re-indexing button
    const [isReindexing, setIsReindexing] = useState(false);

    const handleCleanupDatabase = async () => {
        setIsLoading(true);
        setResult(null);
        setError(null);
        try {
            // Expecting { message: string, truncatedTables: string[] } within response.data
            const response = await apiClient.post<{ message: string, truncatedTables: string[] }>('/dev/cleanup-database');
            setResult(`Success: ${response.data.message} (Tables: ${response.data.truncatedTables.join(', ') || 'None'})`);
        } catch (err) {
            let errorMessage = 'An unknown error occurred';
            if (err instanceof AxiosError) {
                errorMessage = err.response?.data?.error?.message || err.response?.data?.message || err.message;
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(`Cleanup failed: ${errorMessage}`);
            console.error('Cleanup database error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReindexProfiles = async () => {
        setIsReindexing(true); // Use specific loading state
        setResult(null);
        setError(null);
        try {
            const response = await apiClient.post<
                { message: string, profilesReindexed: number, errorsEncountered: number }
            >('/dev/reindex-all-profiles');
            setResult(`Re-indexing Success: ${response.data.message}`);
        } catch (err) {
            let errorMessage = 'An unknown error occurred during re-indexing';
            if (err instanceof AxiosError) {
                errorMessage = err.response?.data?.error?.message || err.response?.data?.message || err.message;
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(`Re-indexing failed: ${errorMessage}`);
            console.error('Re-index profiles error:', err);
        } finally {
            setIsReindexing(false); // Clear specific loading state
        }
    };

    return (
        <div style={styles.container}>
            <h1>Developer Playground</h1>

            <div style={styles.section}>
                <h2>Database Operations</h2>
                <button 
                    onClick={handleCleanupDatabase}
                    disabled={isLoading}
                    style={styles.button}
                >
                    {isLoading ? 'Cleaning up...' : 'Cleanup Database (Truncate Tables)'}
                </button>

                {/* Re-index Button */}
                <button 
                    onClick={handleReindexProfiles}
                    disabled={isReindexing || isLoading} // Disable if other long operation is running
                    style={styles.button}
                >
                    {isReindexing ? 'Re-indexing...' : 'Re-index All Profiles'}
                </button>
            </div>

            {result && (
                <div style={{...styles.message, ...styles.success}}>
                    {result}
                </div>
            )}
            {error && (
                <div style={{...styles.message, ...styles.error}}>
                    {error}
                </div>
            )}

            {/* Add sections for other dev tools here */}
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: { padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' },
    section: { marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' },
    button: { padding: '10px 15px', fontSize: '1rem', cursor: 'pointer', marginRight: '10px' },
    message: { marginTop: '15px', padding: '10px', borderRadius: '4px' },
    success: { backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
    error: { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' },
};

export default DevPage; 