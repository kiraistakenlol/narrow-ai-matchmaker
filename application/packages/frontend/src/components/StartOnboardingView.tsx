import React, { useState, useEffect, useRef } from 'react';
import StartOnboardingButton from './StartOnboardingButton';
import RecordingIndicator from './RecordingIndicator';

type DisplayState = 'initial' | 'recording' | 'processing' | 'error' | 'success';

interface StartOnboardingViewProps {
    onOnboardingStarted?: () => void;
    onOnboardingComplete?: () => void;
    onOnboardingError?: (error: string) => void;
    hints?: string[];
}

const StartOnboardingView: React.FC<StartOnboardingViewProps> = ({
    onOnboardingStarted,
    onOnboardingComplete,
    onOnboardingError,
    hints = [],
}) => {

    const [onboardingState, setOnboardingState] = useState<DisplayState>('initial');

    const isButtonDisabled = onboardingState === 'processing' || onboardingState === 'success' || onboardingState === 'error';

    const handleStartClick = () => {
        onOnboardingStarted?.()
        setOnboardingState("recording")
    };

    const handleStopClick = () => {
        if (onboardingState === 'recording') {
            onOnboardingComplete?.();
            setOnboardingState('processing');
        }

        // todo call /initiate, get upload url in response and use this to upload the audio and then call /notify-upload and wait for the response
        // once response is obtained handle it as success or error and switch the state accordingly 
    };

    const showRecordingIndicator = onboardingState === 'recording' || onboardingState === 'processing';
    
    const showButton = onboardingState !== 'success';

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
                                {onboardingState === 'success' && '✓'} {/* Checkmark inside the marker on success */}
                            </span>
                            <span>{hint}</span> {/* Hint text in its own span */}
                        </li>
                    ))}
                </ul>
            )}

            {/* Button */}
            {showButton && (
                <StartOnboardingButton
                    text={onboardingState === 'recording' ? "Stop Recording" : "Start Recording"}
                    disabled={isButtonDisabled}
                    onClick={onboardingState === 'recording' ? handleStopClick : handleStartClick}
                />
            )}

            {/* Indicator */}
            {showRecordingIndicator && (
                <RecordingIndicator
                    isRecording={onboardingState === 'recording'}
                    isProcessing={onboardingState === 'processing'}
                    // recordingTime is managed internally by RecordingIndicator
                />
            )}

            {/* Error Message */}
            {onboardingState === 'error' && error && (
                <div style={styles.error}>{error}</div>
            )}

            {/* Success Message */}
            {onboardingState === 'success' && (
                <div style={styles.success}>Success! Your information has been processed.</div>
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
        listStyleType: 'none', // Remove default bullets
        padding: 0, // Remove default padding
        margin: '0 auto 15px auto',
        textAlign: 'left',
        width: '100%',
        maxWidth: '400px'
    },
    hintItem: {
        display: 'flex', // Use flex to align marker and text
        alignItems: 'center',
        gap: '10px', // Space between marker and text
        marginBottom: '10px',
        color: '#333',
        fontSize: '16px',
        lineHeight: '1.5'
    },
    marker: { // Base style for the marker span
        display: 'inline-flex', // Use flex for centering checkmark inside
        justifyContent: 'center',
        alignItems: 'center',
        width: '10px',
        height: '10px',
        borderRadius: '50%', // Make it circular
        border: '2px solid #ccc', // Default border
        flexShrink: 0, // Prevent marker from shrinking
        fontSize: '12px', // Size for the checkmark
        fontWeight: 'bold'
    },
    uncheckedMarker: {
        // Specific styles for unchecked state (mostly covered by base marker style)
        backgroundColor: '#fff'
    },
    checkedMarker: {
        // Specific styles for checked state
        backgroundColor: '#4CAF50', // Green background
        borderColor: '#4CAF50', // Green border
        color: '#fff' // White checkmark
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