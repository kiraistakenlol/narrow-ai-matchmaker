import React from 'react';

interface StartOnboardingButtonProps {
    text: string;
    disabled?: boolean;
    onClick?: () => void;
}

function StartOnboardingButton({text, disabled = false, onClick}: StartOnboardingButtonProps) {
    return (
        <button
            style={styles.button}
            disabled={disabled}
            onClick={onClick}
        >
            {text}
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