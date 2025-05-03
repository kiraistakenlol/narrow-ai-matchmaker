1. **Event participation needs a status** like "joined," "initialized," or something similar. These statuses help us check if the user has filled in all the info that the event needs (different events might ask for different things). It's kinda like how the profile works — we've got a profile template, and until the user completes it, it's not marked as done.

For the first step, let's keep it simple and just treat any info in the event participation as "completed."

2. Also, the onboarding block should actually kick off the onboarding flow.
   I want to think through how the flow might be different between general profile onboarding and joining an event.
   Maybe for now, I'll just focus on getting the full flow working for the general profile — like when someone visits the main page but their profile's not done yet.

**Final note:** Yeah, go ahead and start with building out the onboarding flow for the general user profile.

done:

*   implemented 5 different state in Start onboardin view 
*   extracted audio recording logic to `AudioRecorder.tsx`
*   created centralized `apiClient.ts` with auth interceptor
*   refactored `StartOnboardingView.tsx` to use `AudioRecorder` and `apiClient`
*   implemented onboarding API happy path (`initiate`, upload, `notify`) in `StartOnboardingView`
*   made `event_id` optional in backend `/onboarding/initiate`, defaulting to first event

Todo;

*   now use this component in home and event pages
*   if user is authenticated, use their existing ID for onboarding instead of creating a new one (update backend logic and `@sequence_onboarding.mmd`)
*   if user is anonymous, ensure the flow prompts for signup/login after audio submission to connect the onboarding session to the authenticated user (clarify in `@sequence_onboarding.mmd`)
*   adjust frontend (`StartOnboardingView`, pages) to handle truly optional event context (don't always pass eventId if not relevant)
*   remove the backend default behavior of using the "first available event" when no `event_id` is provided. Require event context explicitly if onboarding is event-specific.
