import React from 'react';

interface StartOnboardingButtonProps {
    disabled?: boolean;
}

function StartOnboardingButton({disabled = false}: StartOnboardingButtonProps) {
    return (
        <button
            style={styles.button}
            disabled={disabled}
        >
            Start Onboarding
        </button>
    );
}

// Minimal styles (consider centralizing)
const styles: { [key: string]: React.CSSProperties } = {
    button: {
        padding: '10px 20px',
        fontSize: '1rem',
        cursor: 'pointer',
        border: '1px solid #ccc',
        borderRadius: '4px'
    },
};

export default StartOnboardingButton; 