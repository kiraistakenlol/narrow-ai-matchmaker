import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Redux Store
import { Provider } from 'react-redux';
import { store } from './state/store';

// --- AWS Amplify Configuration ---
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      // REQUIRED - Amazon Cognito User Pool ID
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      // REQUIRED - Amazon Cognito Web Client ID
      userPoolClientId: import.meta.env.VITE_COGNITO_WEB_CLIENT_ID,
      // REQUIRED - Hosted UI configuration
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [import.meta.env.VITE_COGNITO_REDIRECT_SIGNIN],
          redirectSignOut: [import.meta.env.VITE_COGNITO_REDIRECT_SIGNOUT],
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
