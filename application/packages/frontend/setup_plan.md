# Frontend Setup Plan: Anonymous Onboarding

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

1. Not Authenticated → Welcome → Onboarding → Review → Complete → Sign Up/Sign In
2. Not Authenticated → Welcome → Sign In (existing)
    - If onboarding data exists, show merge/discard prompt
3. Onboarding Abandoned → Return → Resume or Restart
4. Onboarding Complete, No Signup → Session expires → Show expired state

---

## Summary Table

| Screen/State                | When Shown                                      |
|-----------------------------|-------------------------------------------------|
| Welcome                     | First visit, not authenticated                  |
| Record Introduction         | User starts onboarding                          |
| Review & Confirm            | After recording intro                           |
| Onboarding Complete         | After onboarding, before signup/signin          |
| Sign Up / Sign In           | User chooses to create or access account        |
| Merge/Discard Prompt        | Sign in with existing account after onboarding  |
| Event Context               | Any step, if eventId present                    |
| Error/Expired               | Onboarding/session expired, errors              |
| Authenticated App Entry     | After signup/signin                             |

</rewritten_file> 