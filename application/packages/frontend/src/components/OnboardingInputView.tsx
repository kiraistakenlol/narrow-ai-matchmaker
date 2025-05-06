import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../lib/apiClient';
import AudioRecorder from './AudioRecorder';
import { AxiosError } from 'axios';
import { PresignedUrlResponseDto, OnboardingSessionDto, OnboardingDto, OnboardingGuidanceDto, OnboardingStatus } from '@narrow-ai-matchmaker/common';
import { STORAGE_KEYS } from '../constants/storage';
import { useAppSelector } from '../hooks/hooks';
import { selectAuthStatus, selectAuthUser } from '../state/slices/authSlice';


interface OnboardingInputViewProps {
    onOnboardingComplete?: () => void;
}

/**
    possible cases:
    1. user authorized:
        1.1  onboarding session exists (onboardingId in local storage)
            call /onboarding/:onboardingId to get session and hints
        1.2  onboarding session does not exist
            call GET /onboarding to fetch session and hints
            if not found :
            call GET /onboarding/guidance to fetch hints and then
            call POST /onboarding to create session when start recording is clicked
    2. user not authorized:
        2.1  onboarding session exist (onboardingId in local storage)
            call GET /onboarding/:onboardingId to fetch session and hints
            if not found then call POST /onboarding to create session and hints
        2.2  onboarding session does not exist
            call POST /onboarding to create session and hints

    ps.POST /onboarding should always set onboardingId in local storage
*/
const OnboardingInputView: React.FC<OnboardingInputViewProps> = ({
    onOnboardingComplete,
}: OnboardingInputViewProps) => {

    const authStatus = useAppSelector(selectAuthStatus);

    const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);

    const [onboardingSession, setOnboardingSession] = useState<OnboardingSessionDto | null>(null);
    const [hints, setHints] = useState<string[]>([]);

    const [isInitializing, setIsInitializing] = useState<boolean>(true);

    const [error, setError] = useState<string | null>(null);

    const pollingIntervalRef = useRef<number | null>(null);

    const initializeOnboardingSessionAndHints = async () => {
        const storedOnboardingId = localStorage.getItem(STORAGE_KEYS.ONBOARDING_ID);

        console.log('OnboardingInputView: Initializing onboarding session and hints');
        if (authStatus === 'succeeded') {
            console.log('OnboardingInputView: Auth user found. Checking for existing onboarding...');
            const existingOnboarding = (await findMyUserOnboarding());
            if (existingOnboarding) {
                console.log('OnboardingInputView: Found existing onboarding:', existingOnboarding);
                setOnboardingSession(existingOnboarding.session)
                setHints(existingOnboarding.guidance?.hints || []);
            } else {
                console.log('OnboardingInputView: No existing onboarding found. Checking for stored onboardingId...');
                if (storedOnboardingId) {
                    console.log('OnboardingInputView: Found stored onboardingId:', storedOnboardingId);
                    const existingOnboarding = await fetchOnboardingById(storedOnboardingId);
                    console.log('OnboardingInputView: Fetched onboarding by ID:', existingOnboarding);
                    setOnboardingSession(existingOnboarding.session)
                    setHints(existingOnboarding.guidance?.hints || []);
                } else {
                    console.log('OnboardingInputView: No stored onboardingId found. Fetching base guidance...');
                    const guidance = await fetchBaseGuidance();
                    console.log('OnboardingInputView: Fetched base guidance:', guidance);
                    setHints(guidance.hints);
                }
            }
        } else {
            console.log('OnboardingInputView: No auth user found. Checking for stored onboardingId...');
            if (storedOnboardingId) {
                console.log('OnboardingInputView: Found stored onboardingId:', storedOnboardingId);
                const existingOnboarding = await fetchOnboardingById(storedOnboardingId);
                console.log('OnboardingInputView: Fetched onboarding by ID:', existingOnboarding);
                setOnboardingSession(existingOnboarding.session)
                setHints(existingOnboarding.guidance?.hints || []);
            } else {
                console.log('OnboardingInputView: No stored onboardingId found. Fetching base guidance...');
                const guidance = await fetchBaseGuidance();
                console.log('OnboardingInputView: Fetched base guidance:', guidance);
                setHints(guidance.hints);
            }
        }
        console.log('OnboardingInputView: Initialized. Final state:', onboardingSession, hints);
    };

    useEffect(() => {
        if (authStatus === 'loading' || authStatus === 'N/A') return;
        
        try {
            console.log(authStatus);
            
            setIsInitializing(true);
            initializeOnboardingSessionAndHints();
        } catch (error) {
            console.error('Failed to initialize onboarding:', error);
            setError('Failed to initialize onboarding session');
        } finally {
            setIsInitializing(false);
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [authStatus]);

    const fetchBaseGuidance = async () => {
        console.log('OnboardingInputView: Fetching base guidance');
        const response = await apiClient.get<OnboardingGuidanceDto>('/onboarding/base-guidance');
        console.log('OnboardingInputView: Fetched base guidance:', response.data);
        return response.data;
    }

    const fetchOnboardingById = async (onboardingId: string) => {
        console.log('OnboardingInputView: Fetching onboarding data by ID:', onboardingId);
        const response = await apiClient.get<OnboardingDto>(`/onboarding/${onboardingId}`);
        console.log('OnboardingInputView: Fetched onboarding data:', response.data);
        return response.data;
    }

    const findMyUserOnboarding = async () => {
        const response = await apiClient.get<OnboardingDto>(`/onboarding`);
        return response.data;
    }

    useEffect(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        const poll = async (onboardingSession: OnboardingSessionDto) => {
            try {
                const onboarding = await fetchOnboardingById(onboardingSession.id);
                const newSession = onboarding.session;
                const newHints = onboarding.guidance?.hints || [];

                setHints(newHints);

                if (JSON.stringify(newSession) !== JSON.stringify(onboardingSession)) {
                    console.log('OnboardingInputView: Polling detected session change. New session:', newSession);
                    setOnboardingSession(newSession);

                    if (newSession.status === 'COMPLETED') {
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                        onOnboardingComplete?.();
                    }
                }
            } catch (err: any) {
                const apiErrorMessage = err.response?.data?.message || err.message || 'Failed to poll onboarding status';
                setError(`Polling error: ${apiErrorMessage}`);
                console.error('OnboardingInputView: Polling error:', err);
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            }
        };

        if (onboardingSession && onboardingSession.status === OnboardingStatus.NEEDS_CLARIFICATION) {
            pollingIntervalRef.current = window.setInterval(poll, 5000);
        }
    }, [onboardingSession?.status])


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

        const currentSessionId = onboardingSession?.id;
        const currentEventId = onboardingSession?.eventId;

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
                const initiateResponse = await apiClient.post<OnboardingDto>('/onboarding', initiatePayload);
                const newOnboardingSession = initiateResponse.data.session;

                const onboarding_id = newOnboardingSession?.id;
                if (!onboarding_id) throw new Error('Invalid session data from initiation endpoint.');

                currentOnboardingId = onboarding_id;
                setOnboardingSession(newOnboardingSession);

                localStorage.setItem(STORAGE_KEYS.ONBOARDING_ID, onboarding_id);
                console.log('Stored onboarding ID:', onboarding_id);

                console.log(`Initiated session ${onboarding_id}, now getting upload URL...`);
                const initialUploadResponse = await apiClient.post<PresignedUrlResponseDto>(
                    `/onboarding/${onboarding_id}/audio-upload-url`
                );
                s3Key = initialUploadResponse.data.s3_key;
                uploadUrl = initialUploadResponse.data.upload_url;
                if (!s3Key || !uploadUrl) throw new Error('Invalid response data from initial upload URL endpoint.');
            }

            console.log(`Uploading to S3 key: ${s3Key}`);
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: audioBlob,
                headers: { 'Content-Type': audioBlob.type || 'audio/webm' }
            });
            if (!uploadResponse.ok) {
                throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }

            console.log(`Notifying upload complete for onboardingId: ${currentOnboardingId}`);
            await apiClient.post(`/onboarding/${currentOnboardingId}/notify-upload`, { s3_key: s3Key });

            console.log("Audio processed and notified backend, transitioning to polling state.");
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

    const showLoading = isInitializing;
    const showAudioRecorder = !isProcessingAudio && onboardingSession?.status !== OnboardingStatus.COMPLETED;
    const showError = onboardingSession?.status === OnboardingStatus.FAILED;
    const showCompleted = onboardingSession?.status === OnboardingStatus.COMPLETED;

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

            {showAudioRecorder && (
                <AudioRecorder
                    isProcessing={false}
                    onRecordingComplete={handleRecordingComplete}
                    onRecordingError={handleRecordingError}
                />
            )}

            {isProcessingAudio && (
                <div style={styles.processing}>
                    <p>Processing your information...</p>
                    <p>Status: {onboardingSession?.status || 'Waiting for update...'}</p>
                </div>
            )}

            {showCompleted && (
                <div style={styles.completed}>
                    <p>Your profile is completed!</p>
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