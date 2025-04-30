import React, { ReactNode } from 'react';

interface AuthPromptProps {
    title: string;
    description: string;
    children: ReactNode;
}

function AuthPrompt({ title, description, children }: AuthPromptProps) {
    return (
        <div style={styles.promptBox}>
            <h2 style={styles.title}>{title}</h2>
            <p style={styles.description}>{description}</p>
            <div style={styles.buttonContainer}>
                {children}
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    promptBox: {
        border: '1px solid #ccc',
        padding: '20px',
        margin: '20px 0',
        borderRadius: '4px',
        backgroundColor: '#f8f9fa',
        textAlign: 'center',
        maxWidth: '500px'
    },
    title: { 
        marginBottom: '10px',
        fontSize: '1.5em' 
    },
    description: { 
        marginBottom: '25px', 
        color: '#6c757d' 
    },
    buttonContainer: {
        display: 'flex', 
        gap: '15px', 
        justifyContent: 'center' 
    },
};

export default AuthPrompt; 
