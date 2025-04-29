# Frontend Setup Plan: Anonymous Onboarding

## Prerequisites / Backend Setup

- [x] Configure AWS Cognito resources (User Pool, Google Identity Provider, App Client, Domain) using Terraform in the `infra/terraform` directory. (Requires manual setup of Google OAuth Credentials in Google Cloud Console first).

## Screens & States

### 1. Landing / Welcome Screen
- Welcome message
- Start onboarding (record intro)
- Sign in with Google
- Handles generic and event-specific entry (shows event info if eventId is present)

### 2. Onboarding: Record Introduction
- Audio recording UI (start, stop, playback)
- Progress indicator
- Option to re-record
- (Optional) Text input for additional info

### 3. Onboarding: Review & Confirm
- Playback of recorded intro
- Option to re-record or proceed
- (Optional) Show extracted info for review

### 4. Onboarding: Complete / Next Steps
- Message: "Onboarding complete! Create your account to continue."
- Option to sign up (email/social)
- Option to sign in (if already have an account)

### 5. Sign Up / Sign In
- Sign up form (email/social)
- Sign in form (email/social)
- Handles both new and existing accounts

### 5a. Authenticated - Onboarding Required
- Shown after successful authentication (e.g., Google Sign-In first) if the backend signals onboarding is still needed.
- UI: Simplified welcome/prompt focusing solely on the next required step.
- Key Action: Prominent "Record Introduction" button.
- Note: "Sign In" options are hidden as the user is already authenticated.

### 6. Merge/Discard Anonymous Data Prompt
- If user signs in with an existing account after onboarding:
    - Prompt: "You have onboarding data from this session. Merge with your existing profile or discard?"
    - Option to merge (update profile with new intro)
    - Option to discard (keep existing profile)

### 7. Event Context Screens
- If onboarding started from an event link:
    - Show event info on welcome/onboarding screens
    - After signup/signin, confirm event participation

### 8. Error & Edge Case States
- Onboarding/session expired
- Failed verification (signup)
- Network/server errors
- Data merge/discard failed

### 9. Authenticated App Entry
- After successful signup/signin, redirect to:
    - Event page (if event context)
    - Main dashboard/home (if no event context)

---

## State Transitions (High-Level)

1. Not Authenticated → Welcome → Onboarding → Review → Complete → Sign Up (new user) → Authenticated App Entry
2. Not Authenticated → Welcome → Onboarding → Review → Complete → Sign In (existing user) → Merge/Discard Prompt → Authenticated App Entry
3. Not Authenticated → Welcome → Sign In (existing user, onboarding complete) → Authenticated App Entry
4. Not Authenticated → Welcome → Sign In (new user or existing user needing onboarding) → Authenticated - Onboarding Required Screen → Onboarding → Review → Complete (backend links data) → Authenticated App Entry
5. Onboarding Abandoned → Return → Resume or Restart
6. Onboarding Complete, No Signup → Session expires → Show expired state

---

## Summary Table

| Screen/State                | When Shown                                      |
|-----------------------------|-------------------------------------------------|
| Welcome                     | First visit, not authenticated                  |
| Record Introduction         | User starts onboarding                          |
| Review & Confirm            | After recording intro                           |
| Onboarding Complete         | After onboarding, before signup/signin          |
| Sign Up / Sign In           | User chooses to create or access account        |
| Authenticated - Onboarding Required | Authenticated, but backend requires onboarding |
| Merge/Discard Prompt        | Sign in with existing account after anonymous onboarding |
| Event Context               | Any step, if eventId present                    |
| Error/Expired               | Onboarding/session expired, errors              |
| Authenticated App Entry     | After signup/signin and onboarding is complete  |

---

## Sign-In Page Implementation (Phase 1 - Frontend Only)

- [x] Install `aws-amplify` library.
- [x] Add Cognito environment variables (`VITE_COGNITO_*`) to `.env` and `.env.example`.
- [x] Configure Amplify library in the frontend (e.g., in `main.tsx` or a dedicated config file) using environment variables.
- [x] Create Sign-In Page Component:
    - [x] Add "Sign in with Google" button.
    - [x] Implement button click handler to call `Auth.federatedSignIn({ provider: 'Google' })`.
- [x] Create Callback Component/Route:
    - [x] Set up a route matching the Cognito Redirect URI (e.g., `/auth/callback`).
    - [ ] Use `useEffect` hook and Amplify listeners/functions to detect successful redirect from Cognito.
    - [ ] (Temporary) Update local UI state to indicate tokens are present (for visual confirmation only).

</rewritten_file> 