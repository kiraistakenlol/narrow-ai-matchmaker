export interface CognitoIdTokenPayload {
    sub: string; // Subject (User ID) - MANDATORY
    email?: string;
    email_verified?: boolean;
    'cognito:username'?: string;
    aud: string; // Audience (App Client ID)
    token_use: 'id' | 'access'; // Should be 'id' for the ID token
    auth_time: number; // Timestamp
    iss: string; // Issuer URL
    exp: number; // Expiration Timestamp
    iat: number; // Issued At Timestamp
    // Add any other custom attributes you might have configured in Cognito
    [key: string]: any; // Allow other potential claims
} 