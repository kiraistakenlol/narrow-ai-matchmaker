import React, {useState, useEffect, useRef} from 'react';
import apiClient from '../lib/apiClient';
import AudioRecorder from './AudioRecorder';
import {AxiosError} from 'axios';
import {InitiateOnboardingResponseDto, PresignedUrlResponseDto, OnboardingSessionDto, OnboardingDto} from '@narrow-ai-matchmaker/common';
import { STORAGE_KEYS } from '../constants/storage';

// Internal component state reflecting the overall process
type OnboardingProcessState = 'idle' | 'loading' | 'needs_input' | 'processing_audio' | 'polling_status' | 'error' | 'completed';

interface OnboardingInputViewProps {
    onOnboardingFinished: () => void;
}

const OnboardingInputView: React.FC<OnboardingInputViewProps> = ({
    onOnboardingFinished,
}: OnboardingInputViewProps) => {
    const [processState, setProcessState] = useState<OnboardingProcessState>('loading');
    const [session, setSession] = useState<OnboardingSessionDto | null>(null);
    const [hints, setHints] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchOnboardingData = async () => {
        console.log('OnboardingInputView: Fetching onboarding data...');
        setProcessState('loading');
        setError(null);
        try {
            const response = await apiClient.get<OnboardingDto>('/onboarding');
            const onboardingData = response.data;
            const fetchedSession = onboardingData.session;
            const fetchedHints = onboardingData.guidance?.hints || [];

            console.log('OnboardingInputView: Fetched Session:', fetchedSession);
            console.log('OnboardingInputView: Fetched Hints:', fetchedHints);

            setSession(fetchedSession);
            setHints(fetchedHints);

            if (!fetchedSession || fetchedSession.status === 'NEEDS_CLARIFICATION') {
                setProcessState('needs_input');
            } else if (fetchedSession.status === 'COMPLETED') {
                setProcessState('completed');
                onOnboardingFinished();
            } else {
                setProcessState('polling_status');
            }

        } catch (err: any) {
            const fetchError = `Failed to fetch onboarding data: ${err.response?.data?.message || err.message}`;
            console.error('OnboardingInputView:', fetchError, err);
            setError(fetchError);
            setProcessState('error');
        }
    };

    useEffect(() => {
        fetchOnboardingData();
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        if (processState === 'polling_status' && session) {
            console.log(`OnboardingInputView: Starting polling for session ${session.id}, status: ${session.status}`);
            const poll = async () => {
                try {
                    console.log(`OnboardingInputView: Polling status for ${session.id}...`);
                    const response = await apiClient.get<OnboardingDto>('/onboarding');
                    const polledData = response.data;
                    const newSessionData = polledData.session;
                    const newHintsData = polledData.guidance?.hints || [];

                    setHints(newHintsData);

                    if (JSON.stringify(newSessionData) !== JSON.stringify(session)) {
                        console.log('OnboardingInputView: Polling detected session change. New session:', newSessionData);
                        setSession(newSessionData);

                        if (!newSessionData || newSessionData.status === 'NEEDS_CLARIFICATION') {
                             setProcessState('needs_input');
                             if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                        } else if (newSessionData.status === 'COMPLETED') {
                             setProcessState('completed');
                             if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                             onOnboardingFinished();
                        } else {
                             setProcessState('polling_status');
                        }
                    }
                } catch (err: any) {
                    const apiErrorMessage = err.response?.data?.message || err.message || 'Failed to poll onboarding status';
                    setError(`Polling error: ${apiErrorMessage}`);
                    setProcessState('error');
                    console.error('OnboardingInputView: Polling error:', err);
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                }
            };
            pollingIntervalRef.current = setInterval(poll, 5000);
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [processState, session, onOnboardingFinished]);

    const handleRecordingError = (recorderError: string) => {
        const fullError = `Recording Error: ${recorderError}`;
        setError(fullError);
        setProcessState('error');
    };

    const handleRecordingComplete = async (audioBlob: Blob) => {
        setProcessState('processing_audio');
        setError(null);

        let currentOnboardingId: string;
        let s3Key: string;
        let uploadUrl: string;

        const currentSessionId = session?.id;
        const currentEventId = session?.eventId;

        try {
            if (currentSessionId) {
                console.log(`Using existing onboardingId from state: ${currentSessionId}`);
                currentOnboardingId = currentSessionId;
                const subsequentUploadResponse = await apiClient.post<PresignedUrlResponseDto>(
                    `/onboarding/${currentSessionId}/audio-upload-url`
                );
                s3Key = subsequentUploadResponse.data.s3_key;
                uploadUrl = subsequentUploadResponse.data.upload_url;
                 if (!s3Key || !uploadUrl) throw new Error('Invalid response data from subsequent upload URL endpoint.');
            } else {
                console.log('No session in state, initiating new session...');
                const initiatePayload: { event_id?: string } = {};
                if (currentEventId) {
                    initiatePayload.event_id = currentEventId;
                }
                const initiateResponse = await apiClient.post<InitiateOnboardingResponseDto>('/onboarding/initiate', initiatePayload);
                const {onboarding_id, upload_details} = initiateResponse.data;
                 if (!onboarding_id || !upload_details?.s3_key || !upload_details?.upload_url) throw new Error('Invalid response data from initiation endpoint.');
                currentOnboardingId = onboarding_id;
                s3Key = upload_details.s3_key;
                uploadUrl = upload_details.upload_url;

                // Store onboarding ID for anonymous user
                if (!session) {
                    localStorage.setItem(STORAGE_KEYS.ONBOARDING_ID, onboarding_id);
                }
            }

            console.log(`Uploading to S3 key: ${s3Key}`);
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: audioBlob,
                headers: {'Content-Type': audioBlob.type || 'audio/webm'}
            });
            if (!uploadResponse.ok) {
                throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }

            console.log(`Notifying upload complete for onboardingId: ${currentOnboardingId}`);
            await apiClient.post(`/onboarding/${currentOnboardingId}/notify-upload`, { s3_key: s3Key });

            console.log("Audio processed and notified backend, transitioning to polling state.");
            setProcessState('polling_status');
        } catch (err: any) {
            let apiErrorMessage = 'An unknown error occurred during audio processing.';
             if (err instanceof AxiosError) apiErrorMessage = `API Error: ${err.response?.data?.message || err.message}`;
             else if (err instanceof Error) apiErrorMessage = err.message;
            const fullError = `Audio processing failed: ${apiErrorMessage}`;
            setError(fullError);
            setProcessState('error');
        }
    };

    const showLoading = processState === 'loading';
    const showInput = processState === 'needs_input';
    const showProcessing = processState === 'processing_audio' || processState === 'polling_status';
    const showError = processState === 'error';
    const showCompleted = processState === 'completed';

    return (
        <div style={styles.container}>
            {showLoading && <p>Loading onboarding status...</p>}

            {hints.length > 0 && !showLoading && !showCompleted && (
                <ul style={styles.hints}>
                    {hints.map((hint: string, index: number) => (
                        <li key={index} style={styles.hintItem}>
                            <span style={{ ...styles.marker, ...styles.uncheckedMarker }}></span>
                            <span>{hint}</span>
                        </li>
                    ))}
                </ul>
            )}

            {showInput && (
                <AudioRecorder
                    isProcessing={false}
                    onRecordingComplete={handleRecordingComplete}
                    onRecordingError={handleRecordingError}
                />
            )}

            {showProcessing && (
                 <div style={styles.processing}>
                     <p>Processing your information...</p>
                     <p>Status: {session?.status || 'Waiting for update...'}</p>
                 </div>
             )}

            {showError && error && (
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
};

export default OnboardingInputView;