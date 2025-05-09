import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Redux Store
import {Provider} from 'react-redux';
import {store} from './state/store';

// --- AWS Amplify Configuration ---
import {Amplify} from 'aws-amplify';

// ---- START DEBUG LOGGING ----
const cognitoSignInRedirect = import.meta.env.VITE_COGNITO_REDIRECT_SIGNIN;
const cognitoSignOutRedirect = import.meta.env.VITE_COGNITO_REDIRECT_SIGNOUT;
const cognitoUserPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const cognitoUserPoolClientId = import.meta.env.VITE_COGNITO_WEB_CLIENT_ID;
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;

console.log("VITE_COGNITO_USER_POOL_ID:", cognitoUserPoolId);
console.log("VITE_COGNITO_WEB_CLIENT_ID:", cognitoUserPoolClientId);
console.log("VITE_COGNITO_DOMAIN:", cognitoDomain);
console.log("VITE_COGNITO_REDIRECT_SIGNIN used by Amplify:", cognitoSignInRedirect);
console.log("VITE_COGNITO_REDIRECT_SIGNOUT used by Amplify:", cognitoSignOutRedirect);
// ---- END DEBUG LOGGING ----

Amplify.configure({
  Auth: {
    Cognito: {
      // REQUIRED - Amazon Cognito User Pool ID
      userPoolId: cognitoUserPoolId,
      // REQUIRED - Amazon Cognito Web Client ID
      userPoolClientId: cognitoUserPoolClientId,
      // REQUIRED - Hosted UI configuration
      loginWith: {
        oauth: {
          domain: cognitoDomain,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [cognitoSignInRedirect],
          redirectSignOut: [cognitoSignOutRedirect],
          responseType: 'code' // Use Authorization Code Grant flow
        }
      }
    }
  }
});
// --- End AWS Amplify Configuration ---

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)
