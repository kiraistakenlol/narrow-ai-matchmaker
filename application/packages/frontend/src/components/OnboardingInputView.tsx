import React, { useState, useEffect } from 'react';
import {
    createOnboardingSession,
    getAudioUploadUrl,
    notifyUploadComplete
} from '../lib/apiClient';
import AudioRecorder from './AudioRecorder';
import { AxiosError } from 'axios';
import { OnboardingStatus } from '@narrow-ai-matchmaker/common';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { fetchOnboardingData, selectFullOnboardingState, selectOnboardingGuidance, selectOnboardingSession, setGuidance, setSession } from '../state/slices/onboardingSlice';


interface OnboardingInputViewProps {
    onOnboardingComplete?: () => void;
}

const OnboardingInputView: React.FC<OnboardingInputViewProps> = ({
    onOnboardingComplete,
}: OnboardingInputViewProps) => {

    const dispatch = useAppDispatch();

    const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);

    const onboardingSession = useAppSelector(selectOnboardingSession);
    const { initialStateLoaded } = useAppSelector(selectFullOnboardingState);

    const hints = useAppSelector(selectOnboardingGuidance)?.hints || [];

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('useEffect for completion check triggered with status:', onboardingSession?.status);
        if (onboardingSession?.status === OnboardingStatus.COMPLETED) {
            console.log('Onboarding COMPLETED, calling onOnboardingComplete callback');
            onOnboardingComplete?.();
        }
    }, [onboardingSession?.status, onOnboardingComplete]);


    const handleRecordingError = (recorderError: string) => {
        const fullError = `Recording Error: ${recorderError}`;
        setError(fullError);
    };

    const handleRecordingComplete = async (audioBlob: Blob) => {
        setIsProcessingAudio(true);
        setError(null);

        let currentOnboardingId: string;
        let s3Key: string;
        let uploadUrl: string;

        const currentEventId = onboardingSession?.eventId;
 
        try {
            if (onboardingSession) {
                console.log('Session in state, using existing session...');
                currentOnboardingId = onboardingSession.id;
            } else {
                console.log('No session in state, initiating new session...');
                const newSessionResponse = await createOnboardingSession({ event_id: currentEventId || undefined });
                const newOnboardingSession = newSessionResponse.session;
                dispatch(setSession(newOnboardingSession));
                dispatch(setGuidance(newSessionResponse.guidance));

                currentOnboardingId = newOnboardingSession.id;
            }

            const uploadUrlResponse = await getAudioUploadUrl(currentOnboardingId);
            s3Key = uploadUrlResponse.s3_key;
            uploadUrl = uploadUrlResponse.upload_url;
            if (!s3Key || !uploadUrl) throw new Error('Invalid response data from subsequent upload URL endpoint.');

            console.log(`Uploading audio to S3 key: ${s3Key}`);
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: audioBlob,
                headers: { 'Content-Type': audioBlob.type || 'audio/webm' }
            });
            if (!uploadResponse.ok) {
                throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }

            console.log(`Notifying backend that audio upload is complete for onboardingId: ${currentOnboardingId}`);
            await notifyUploadComplete(currentOnboardingId, s3Key);

            dispatch(fetchOnboardingData(currentOnboardingId));
        } catch (err: any) {
            let apiErrorMessage = 'An unknown error occurred during audio processing.';
            if (err instanceof AxiosError) apiErrorMessage = `API Error: ${err.response?.data?.message || err.message}`;
            else if (err instanceof Error) apiErrorMessage = err.message;
            const fullError = `Audio processing failed: ${apiErrorMessage}`;
            setError(fullError);
        } finally {
            setIsProcessingAudio(false);
        }
    };

    const onboardingFailed = onboardingSession?.status === OnboardingStatus.FAILED;
    const onboardingCompleted = onboardingSession?.status === OnboardingStatus.COMPLETED;
    const onboardingNeedsMoreInfo = onboardingSession?.status === OnboardingStatus.NEEDS_MORE_INFO;

    if (!initialStateLoaded) {
        return (
            <div style={styles.container}>
                <p>Loading onboarding information...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>

            {hints.length > 0 && !onboardingCompleted && (
                <ul style={styles.hints}>
                    {hints.map((hint: string, index: number) => (
                        <li key={index} style={styles.hintItem}>
                            <span style={styles.marker}></span>
                            <span style={styles.hintText}>{hint}</span>
                        </li>
                    ))}
                </ul>
            )}

            {onboardingNeedsMoreInfo && (
                <div style={styles.needsMoreInfo}>
                    <p>Thanks! Please provide a bit more detail based on the updated hints above and record your message again.</p>
                </div>
            )}

            {!isProcessingAudio ?
                <AudioRecorder
                    isProcessing={false}
                    onRecordingComplete={handleRecordingComplete}
                    onRecordingError={handleRecordingError}
                />
                : <div style={styles.processing}>
                    <p>Processing your information...</p>
                </div>
            }

            {onboardingCompleted && (
                <div style={styles.completed}>
                    <p>Your profile is completed!</p>
                </div>
            )}

            {onboardingFailed && error && (
                <div style={styles.error}>{error}</div>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '20px',
    },
    hints: {
        listStyleType: 'none',
        padding: '0',
        margin: '0 auto 15px auto',
        textAlign: 'left',
        width: '100%',
        maxWidth: '450px',
    },
    hintItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
        padding: '10px',
        borderBottom: '1px solid #eee',
    },
    marker: {
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#adb5bd',
        flexShrink: 0,
    },
    hintText: {
        color: '#333',
        fontSize: '16px',
        lineHeight: '1.5',
    },
    error: {
        color: '#f44336',
        marginTop: '8px',
        textAlign: 'center',
        maxWidth: '400px'
    },
    processing: {
        marginTop: '15px',
        padding: '10px',
        color: '#333',
        textAlign: 'center'
    },
    needsMoreInfo: {
        marginTop: '15px',
        padding: '10px 15px',
        color: '#333',
        textAlign: 'center',
        backgroundColor: '#e3f2fd',
        border: '1px solid #bbdefb',
        borderRadius: '4px',
        maxWidth: '450px',
        width: '100%',
    },
    completed: {
        marginTop: '15px',
        padding: '10px',
        color: '#333',
        textAlign: 'center'
    },
};

export default OnboardingInputView;