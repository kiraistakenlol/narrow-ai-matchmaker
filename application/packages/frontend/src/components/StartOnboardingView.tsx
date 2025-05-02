import React, {useState} from 'react';
import StartOnboardingButton from './StartOnboardingButton';
import RecordingIndicator from './RecordingIndicator';

interface OnboardingPromptProps {
    onStartOnboarding: () => void; // Callback when the button is clicked
    disabled?: boolean; // To disable the button (e.g., while recording)
}

const StartOnboardingView: React.FC<OnboardingPromptProps> = ({
                                                               onStartOnboarding,
                                                               disabled = false
                                                           }) => {

    const [isRecording, setIsRecording] = useState(false)

    return (
        <div style={styles.container}>
            <StartOnboardingButton
                text={isRecording ? "Stop recording" : "Start Recording"}
                disabled={false}
                onClick={() => {
                    setIsRecording(!isRecording)
                    onStartOnboarding()
                }}
                />
            <RecordingIndicator isRecording={isRecording}/>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px' // Space between button and indicator
    }
};

export default StartOnboardingView;