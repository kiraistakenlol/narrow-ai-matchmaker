import React, {useEffect, useRef, useState} from 'react';
import StartOnboardingButton from './StartOnboardingButton'; // Reusing the button style
import RecordingIndicator from './RecordingIndicator'; // Reusing the indicator

type RecordingState = 'idle' | 'recording' | 'stopped' | 'error';

interface AudioRecorderProps {
    isProcessing: boolean; // Added prop to indicate parent is processing
    onRecordingComplete: (blob: Blob) => void;
    onRecordingError: (error: string) => void;
    // Optional: Add onRecordingStart/Stop callbacks if needed by parent
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
    isProcessing,
    onRecordingComplete,
    onRecordingError,
}) => {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const cleanupMedia = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                console.warn('Error stopping media recorder during cleanup:', e);
            }
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
    };

    useEffect(() => {
        return () => {
            cleanupMedia();
        };
    }, []);

    const handleError = (errorMessage: string) => {
        console.error("AudioRecorder Error:", errorMessage);
        setError(errorMessage);
        setRecordingState('error');
        onRecordingError(errorMessage);
        cleanupMedia();
    };

    const handleStartRecording = async () => {
        setError(null);
        setRecordingState('idle');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            handleError('Media devices API not supported.');
            return;
        }

        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            setRecordingState('recording');

            audioChunksRef.current = [];
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
                'audio/mpeg'
            ];
            const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

            if (!supportedMimeType) {
                throw new Error('No supported audio MIME type found.');
            }

            mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: supportedMimeType });

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                setRecordingState('stopped'); // Indicate recording has physically stopped
                streamRef.current?.getTracks().forEach(track => track.stop());
                streamRef.current = null;

                if (audioChunksRef.current.length === 0) {
                    handleError('No audio data captured.');
                    return;
                }

                const audioBlob = new Blob(audioChunksRef.current, { type: supportedMimeType });
                audioChunksRef.current = [];

                if (audioBlob.size === 0) {
                    handleError('Audio data is empty.');
                    return;
                }

                onRecordingComplete(audioBlob); // Pass the blob to the parent
            };

            mediaRecorderRef.current.onerror = (event) => {
                handleError(`Recorder error: ${(event as any).error?.message || 'Unknown'}`);
            };

            mediaRecorderRef.current.start();

        } catch (err: any) {
            handleError(`Failed to start: ${err.message || 'Unknown'}`);
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop(); // Triggers onstop
        }
    };

    // Button is disabled if recording stopped OR parent is processing
    const isButtonDisabled = recordingState === 'stopped' || isProcessing;
    // Show indicator if recording OR parent is processing
    const showIndicator = recordingState === 'recording' || isProcessing;

    return (
        <div style={styles.container}>
            {/* Only show button if not processing */} 
            {!isProcessing && (
                 <StartOnboardingButton
                    text={recordingState === 'recording' ? "Stop Recording" : "Start Recording"}
                    disabled={isButtonDisabled}
                    onClick={recordingState === 'recording' ? handleStopRecording : handleStartRecording}
                />
            )}
           
            {/* Show indicator if recording or processing */} 
            {showIndicator && (
                 <RecordingIndicator 
                    isRecording={recordingState === 'recording'} 
                    isProcessing={isProcessing} 
                />
            )}

            {/* Show recorder-specific errors only if not processing */} 
            {error && !isProcessing && (
                <div style={styles.errorText}>{error}</div>
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
    },
    errorText: {
        color: '#dc3545', // Bootstrap danger color
        fontSize: '0.9em',
        marginTop: '5px'
    }
};

export default AudioRecorder; 