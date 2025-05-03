import React from 'react';
import OnboardingInputView from './OnboardingInputView.tsx';
import SignInWithGoogleButton from './SignInWithGoogleButton';


interface ContainerProps {
    title: string;
    description: string;
    showSignIn?: boolean;
    showOnboarding?: boolean;
    onStartOnboarding?: () => void;
    isRecording?: boolean;
    onSignInWithGoogle?: () => void;
}

function SigninOrOnboardView({
    title,
    description,
    showSignIn = false,
    showOnboarding = false,
    onStartOnboarding = () => {},
    onSignInWithGoogle = () => {}
}: ContainerProps) {
    // Determine if both sections are shown to add divider/spacing
    const showBoth = showSignIn && showOnboarding;

    return (
        <div style={styles.promptBox}>
            <h2 style={styles.title}>{title}</h2>
            <p style={styles.description}>{description}</p>
            <div style={styles.actionArea}>
                {showOnboarding && (
                    <OnboardingInputView
                        onOnboardingStarted={onStartOnboarding}
                        onOnboardingComplete={() => {}}
                        onOnboardingError={() => {}}
                        hints={[
                            "Speak clearly into your microphone",
                            "Tell us about yourself in a few sentences",
                            "Include your interests and what brings you here"
                        ]}
                    />
                )}
                {/* Optional: Add a visual separator if both are shown */}
                {showBoth && <div style={styles.separator}>OR</div>}

                {showSignIn && (
                    <SignInWithGoogleButton onClick={onSignInWithGoogle} />
                )}
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    promptBox: {
        border: '1px solid #ccc',
        padding: '20px',
        margin: '20px auto', // Center horizontally
        borderRadius: '4px',
        backgroundColor: '#f8f9fa',
        textAlign: 'center',
        maxWidth: '500px',
        display: 'flex', // Use flexbox for vertical layout
        flexDirection: 'column',
        alignItems: 'center'
    },
    title: {
        marginBottom: '10px',
        fontSize: '1.5em'
    },
    description: {
        marginBottom: '25px',
        color: '#6c757d'
    },
    actionArea: { // New style for the area holding the conditional components
        width: '100%', // Take full width of container
        display: 'flex',
        flexDirection: 'column', // Stack items vertically
        alignItems: 'center',    // Center items horizontally
        gap: '20px'             // Add space between items/separator
    },
    separator: { // Style for the "OR" divider
        color: '#6c757d',
        fontWeight: 'bold',
        margin: '10px 0', // Add some vertical space around it
        width: '80%',
        textAlign: 'center',
        borderBottom: '1px solid #eee', // Optional line
        lineHeight: '0.1em',
        fontSize: '0.9em'
    },
};

export default SigninOrOnboardView;
