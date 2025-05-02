import React, { useState } from 'react';
import StartOnboardingView from './StartOnboardingView';

type TestState = 'initial' | 'recording' | 'processing' | 'error' | 'success';

const StartOnboardingViewTest: React.FC = () => {
    const [testState, setTestState] = useState<TestState>('initial');
    // This now directly represents if the parent *thinks* recording is active
    const [isRecordingActive, setIsRecordingActive] = useState(false);

    const hints = [
        "your background",
        "your goals on Event X",
        "are you visiting Argentina or Living here"
    ];

    const handleStartRecording = () => {
        console.log("Test: Start recording requested");
        setIsRecordingActive(true);
        setTestState('recording'); // Ensure visual state matches
    };

    const handleStopRecording = () => {
        console.log("Test: Stop recording requested");
        setIsRecordingActive(false);
        setTestState('processing'); // Assume processing starts after stop
        // Simulate processing time and outcome
        setTimeout(() => {
            const success = Math.random() > 0.3; // Simulate 70% success rate
            if (success) {
                setTestState('success');
            } else {
                setTestState('error');
            }
        }, 2000); // Simulate 2 second processing time
    };

    // Reset helper
    const resetState = () => {
        setIsRecordingActive(false);
        setTestState('initial');
    };

    // --- Button Enable/Disable Logic ---
    const canStartRecording = testState === 'initial';
    const canStartProcessing = testState === 'recording';
    const canHaveOutcome = testState === 'processing'; // Error or Success

    // Determine props based on the test state
    const isProcessing = testState === 'processing';
    const isSuccess = testState === 'success';
    const error = testState === 'error' ? 'Simulated error: Failed to process audio.' : null;
    // Button should be disabled if processing, successful, has error, or recording
    const isDisabled = isProcessing || isSuccess || !!error;

    return (
        <div style={styles.container}>
            <div style={styles.controls}>
                <button onClick={resetState}>Reset to Initial</button>
                {/* Apply disabled logic to force buttons */}
                <button
                    onClick={() => { setIsRecordingActive(true); setTestState('recording'); }}
                    disabled={!canStartRecording}
                >
                    Force Recording State
                </button>
                <button
                    onClick={() => { setIsRecordingActive(false); setTestState('processing'); }}
                    disabled={!canStartProcessing}
                >
                    Force Processing State
                </button>
                <button
                    onClick={() => { setIsRecordingActive(false); setTestState('error'); }}
                    disabled={!canHaveOutcome}
                >
                    Force Error State
                </button>
                <button
                    onClick={() => { setIsRecordingActive(false); setTestState('success'); }}
                    disabled={!canHaveOutcome}
                >
                    Force Success State
                </button>
            </div>

            <StartOnboardingView
                hints={hints}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                isRecording={isRecordingActive} // Pass the recording status directly
                isProcessing={isProcessing}
                isSuccess={isSuccess}
                error={error}
                disabled={isDisabled}
            />

            <div style={styles.currentStateDebug}>
                Current Test State: {testState} | isRecordingActive: {isRecordingActive.toString()}
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto'
    },
    controls: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
    },
    currentStateDebug: {
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#f0f0f0',
        border: '1px solid #ccc',
        fontSize: '12px'
    }
};

export default StartOnboardingViewTest; 