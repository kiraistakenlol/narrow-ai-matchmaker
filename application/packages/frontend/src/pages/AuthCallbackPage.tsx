import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../state/hooks';
import { selectAuthStatus } from '../state/slices/authSlice';

function AuthCallbackPage() {
    const navigate = useNavigate();
    const status = useAppSelector(selectAuthStatus);

    useEffect(() => {
        // Redirect once authentication is successful according to Redux state
        if (status === 'succeeded') {
            navigate('/');
        } 
        // Optionally handle 'failed' status here (e.g., navigate to /signin with error)
        // else if (status === 'failed') {
        //    navigate('/signin?error=auth_failed');
        // }
    }, [status, navigate]);

    // Display loading indicator while waiting for Amplify Hub/Redux to process authentication
    return (
        <div style={styles.container}>
            <p>Signing in...</p>
            {/* Add a spinner or more elaborate loading indicator if desired */}
        </div>
    );
}

// Minimal styles
const styles: { [key: string]: React.CSSProperties } = {
    container: { 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        fontFamily: 'sans-serif' 
    },
};

export default AuthCallbackPage; 