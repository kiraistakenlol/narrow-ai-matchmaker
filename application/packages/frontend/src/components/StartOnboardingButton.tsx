import React from 'react';

interface StartOnboardingButtonProps {
    text: string;
    disabled?: boolean;
    onClick?: () => void;
}

function StartOnboardingButton({text, disabled = false, onClick}: StartOnboardingButtonProps) {
    return (
        <button
            style={
                {
                    padding: '10px 20px',
                    fontSize: '1rem',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                }
            }
            disabled={disabled}
            onClick={onClick}
        >
            {text}
        </button>
    );
}

export default StartOnboardingButton; 