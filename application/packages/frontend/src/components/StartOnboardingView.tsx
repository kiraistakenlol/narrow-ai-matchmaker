import React from 'react';
import StartOnboardingButton from './StartOnboardingButton';
import RecordingIndicator from './RecordingIndicator';

interface StartOnboardingViewProps {
    onStartRecording: () => void; // Callback when start recording is clicked
    onStopRecording: () => void;  // Callback when stop recording is clicked
    disabled?: boolean;         // To disable buttons (general)
    hints?: string[];           // Optional hints
    isRecording?: boolean;      // Is recording currently active?
    isProcessing?: boolean;     // Is audio processing?
    isSuccess?: boolean;        // Was processing successful?
    error?: string | null;      // Error message, if any
}

const StartOnboardingView: React.FC<StartOnboardingViewProps> = ({
    onStartRecording,
    onStopRecording,
    disabled = false, // General disabled prop from parent
    hints = [],
    isRecording = false,
    isProcessing = false,
    isSuccess = false,
    error = null,
}) => {
    // Determine the display state purely based on props
    let displayState: 'initial' | 'recording' | 'processing' | 'error' | 'success' = 'initial';
    if (isSuccess) {
        displayState = 'success';
    } else if (error) {
        displayState = 'error';
    } else if (isProcessing) {
        displayState = 'processing';
    } else if (isRecording) { // Use the isRecording prop
        displayState = 'recording';
    }

    // Show recording indicator if recording or processing
    const showIndicator = displayState === 'recording' || displayState === 'processing';
    // Show button unless successful
    const showButton = displayState !== 'success';

    // Determine if the button itself should be disabled
    const isButtonDisabled = disabled || isProcessing || isSuccess || !!error;

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
                                    ...(displayState === 'success' ? styles.checkedMarker : styles.uncheckedMarker)
                                }}
                            >
                                {displayState === 'success' && '✓'} {/* Checkmark inside the marker on success */}
                            </span>
                            <span>{hint}</span> {/* Hint text in its own span */}
                        </li>
                    ))}
                </ul>
            )}

            {/* Button */}
            {showButton && (
                <StartOnboardingButton
                    text={displayState === 'recording' ? "Stop Recording" : "Start Recording"}
                    disabled={isButtonDisabled} // Use calculated disabled state
                    onClick={displayState === 'recording' ? onStopRecording : onStartRecording} // Directly use passed callbacks
                />
            )}

            {/* Indicator */}
            {showIndicator && (
                <RecordingIndicator
                    isRecording={displayState === 'recording'} // Use isRecording prop directly
                    isProcessing={displayState === 'processing'}
                    // recordingTime is managed internally by RecordingIndicator
                />
            )}

            {/* Error Message */}
            {displayState === 'error' && (
                <div style={styles.error}>{error}</div>
            )}

            {/* Success Message */}
            {displayState === 'success' && (
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