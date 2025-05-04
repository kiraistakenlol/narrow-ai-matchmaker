## Done

*   Refactored authentication flow to handle backend user creation sync and `UserAlreadyAuthenticatedException`.
*   Implemented global API response wrapper (`ApiResponse`) and interceptor for consistent backend responses (200 OK with `data: null` for not found).
*   Updated frontend API client to handle the wrapped response.
*   Created `/dev` page and backend service/controller for developer operations (initially database cleanup).

## TODO

*   Implement profile quality assessment and provide dynamic hints/guidance to the user.
    *   Goal: If **the** profile isn't sufficient (initially based on onboarding status like `NEEDS_CLARIFICATION`), inform the user what's missing.
    *   Idea: Create a backend endpoint (e.g., `GET /onboarding/guidance`) that returns the current onboarding session *and* context-specific hints.
    *   First Step: Backend returns hardcoded hints based on onboarding status (e.g., initial hints if no session, clarification hints if `NEEDS_CLARIFICATION`).
    *   Frontend: `HomePage` calls this new endpoint, extracts hints, and passes them to `OnboardingInputView`.
