import React, { useState, useEffect } from 'react';
// import RecordingIndicator from './RecordingIndicator'; // No longer needed here
import apiClient from '../lib/apiClient';
import AudioRecorder from './AudioRecorder';
import { AxiosError } from 'axios';
import { InitiateOnboardingResponseDto } from '@narrow-ai-matchmaker/common';

type DisplayState = 'initial' | 'recording' | 'processing' | 'error' | 'success';

interface StartOnboardingViewProps {
    eventId?: string;
    onOnboardingStarted?: () => void;
    onOnboardingComplete?: () => void;
    onOnboardingError?: (error: string) => void;
    hints?: string[];
}

const StartOnboardingView: React.FC<StartOnboardingViewProps> = ({
    eventId,
    onOnboardingStarted,
    onOnboardingComplete,
    onOnboardingError,
    hints = [],
}) => {
    const [onboardingState, setOnboardingState] = useState<DisplayState>('initial');
    const [error, setError] = useState<string | null>(null);

    const handleRecordingError = (recorderError: string) => {
        const fullError = `Recording Error: ${recorderError}`;
        setError(fullError);
        setOnboardingState('error');
        onOnboardingError?.(fullError);
    };

    const handleRecordingComplete = async (audioBlob: Blob) => {
        setOnboardingState('processing');
        setError(null);
        onOnboardingStarted?.();

        try {
            // 1. Initiate Onboarding - conditionally include event_id
            const initiatePayload: { event_id?: string } = {};
            if (eventId) {
                initiatePayload.event_id = eventId;
            }
            const initiateResponse = await apiClient.post<InitiateOnboardingResponseDto>('/onboarding/initiate', initiatePayload);

            // Destructure from the nested upload_details
            const { onboarding_id, upload_details } = initiateResponse.data;
            const { s3_key, upload_url } = upload_details;

            if (!onboarding_id || !s3_key || !upload_url) {
                throw new Error('Invalid response data from initiation endpoint.');
            }

            // 2. Upload Audio to S3
            const uploadResponse = await fetch(upload_url, {
                 method: 'PUT',
                 body: audioBlob,
                 headers: { 'Content-Type': audioBlob.type || 'audio/webm' }
            });
            if (!uploadResponse.ok) {
                throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }

            // 3. Notify Backend
            await apiClient.post(`/onboarding/${onboarding_id}/notify-upload`, {
                s3_key: s3_key
            });

            // Success
            setOnboardingState('success');
            onOnboardingComplete?.();
            setError(null);

        } catch (err: any) {
            let apiErrorMessage = 'An unknown error occurred during processing.';
             if (err instanceof AxiosError) {
                 apiErrorMessage = `API Error: ${err.response?.data?.message || err.message} (Status: ${err.response?.status || 'N/A'})`;
             } else if (err instanceof Error) {
                 apiErrorMessage = err.message;
             }
            const fullError = `Processing failed: ${apiErrorMessage}`;
            setError(fullError);
            setOnboardingState('error');
            onOnboardingError?.(fullError);
        }
    };

    // Determine which high-level elements to show
    // AudioRecorder handles its own internal states (idle, recording, stopped, recorder-error)
    const showRecorder = onboardingState === 'initial' || onboardingState === 'error';
    const showSuccess = onboardingState === 'success';
    // Processing indicator is now INSIDE AudioRecorder, triggered by isProcessing prop
    // Error message is shown below the recorder if the overall state is error

    return (
        <div style={styles.container}>
            {/* Hints */}
            {hints.length > 0 && (
                <ul style={styles.hints}>
                    {hints.map((hint, index) => (
                        <li key={index} style={styles.hintItem}>
                            <span
                                style={{
                                    ...styles.marker,
                                    ...(onboardingState === 'success' ? styles.checkedMarker : styles.uncheckedMarker)
                                }}
                            >
                                {onboardingState === 'success' && '✓'}
                            </span>
                            <span>{hint}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Recorder Area (conditionally renders based on overall state) */}
            {/* Pass processing state down to the recorder */}
            <AudioRecorder
                isProcessing={onboardingState === 'processing'}
                onRecordingComplete={handleRecordingComplete}
                onRecordingError={handleRecordingError}
            />

            {/* Error Message (Show only overall processing/API errors here) */}
            {onboardingState === 'error' && error && (
                <div style={styles.error}>{error}</div> // Shows recording or processing errors
            )}

            {/* Success Message */}
            {showSuccess && (
                <div style={styles.success}>Success! Your information has been processed.</div>
            )}
        </div>
    );
};

// Styles remain the same
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px',
        width: '100%'
    },
    hints: {
        listStyleType: 'none',
        padding: 0,
        margin: '0 auto 15px auto',
        textAlign: 'left',
        width: '100%',
        maxWidth: '400px'
    },
    hintItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '10px',
        color: '#333',
        fontSize: '16px',
        lineHeight: '1.5'
    },
    marker: {
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        border: '2px solid #ccc',
        flexShrink: 0,
        fontSize: '12px',
        fontWeight: 'bold'
    },
    uncheckedMarker: {
        backgroundColor: '#fff'
    },
    checkedMarker: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
        color: '#fff'
    },
    error: {
        color: '#f44336',
        marginTop: '8px',
        textAlign: 'center',
        maxWidth: '400px'
    },
    success: {
        color: '#4CAF50',
        marginTop: '8px',
        fontWeight: 'bold'
    }
};

export default StartOnboardingView;