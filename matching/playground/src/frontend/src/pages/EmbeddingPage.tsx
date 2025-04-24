import React, {useState} from 'react';
import styles from './EmbeddingPage.module.css'; // Using CSS Modules

const API_BASE_URL = 'http://localhost:3000'; // Adjust if your backend runs elsewhere

function EmbeddingPage() {
    const [collectionName, setCollectionName] = useState<string>('profiles');
    const [description, setDescription] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleRemoveNonBase = async () => {
        if (!collectionName) {
            setFeedback({type: 'error', message: 'Collection name is required.'});
            return;
        }
        setIsLoading(true);
        setFeedback(null);
        try {
            const response = await fetch(`${API_BASE_URL}/embed/collection/${collectionName}/non-base`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to remove non-base profiles.');
            }
            setFeedback({
                type: 'success',
                message: data.message || 'Successfully submitted request to remove non-base profiles.'
            });
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmbedSingleProfile = async () => {
        if (!collectionName || !description) {
            setFeedback({type: 'error', message: 'Collection name and description are required.'});
            return;
        }
        setIsLoading(true);
        setFeedback(null);
        try {
            const response = await fetch(`${API_BASE_URL}/embed/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({collectionName, description}),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to embed profile.');
            }
            setFeedback({
                type: 'success',
                message: data.message || `Successfully embedded profile ${data.profileId || ''}.`
            });
            setDescription(''); // Clear description on success
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error instanceof Error ? error.message : 'An unknown error occurred.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.embeddingContainer}>
            <h2>Embedding Management</h2>

            {/* Collection Name Input - Shared */}
            <div className={styles.inputGroup}>
                <label htmlFor="collectionName">Collection Name:</label>
                <input
                    type="text"
                    id="collectionName"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    disabled={isLoading}
                />
            </div>

            {/* Feedback Area */}
            {feedback && (
                <div className={`${styles.feedback} ${feedback.type === 'error' ? styles.error : styles.success}`}>
                    {feedback.message}
                </div>
            )}

            {/* Remove Non-Base Profiles Section */}
            <section className={styles.section}>
                <h3>Remove Non-Base Profiles</h3>
                <p>Deletes all points from the specified collection that do not have the 'source: base' payload.</p>
                <button onClick={handleRemoveNonBase} disabled={isLoading || !collectionName}>
                    {isLoading ? 'Processing...' : 'Remove Non-Base Profiles'}
                </button>
            </section>

            {/* Embed Single Profile Section */}
            <section className={styles.section}>
                <h3>Embed Single Profile</h3>
                <p>Enter a description to create a new profile embedding (marked with 'source: single').</p>
                <div className={styles.inputGroup}>
                    <label htmlFor="description">Description:</label>
                    <textarea
                        id="description"
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isLoading}
                        placeholder="Enter profile description here..."
                    />
                </div>
                <button onClick={handleEmbedSingleProfile} disabled={isLoading || !collectionName || !description}>
                    {isLoading ? 'Embedding...' : 'Embed Single Profile'}
                </button>
            </section>
        </div>
    );
}

export default EmbeddingPage; 