done:

simplified fe be interaction


TODO: 

problem is now after onboarding is complete

i see

'Your profile is completed!'

or

'sign in with google'


OnboardingInputView component should know when to show the "OR" it can know it if it checks the current state of the onboarding or user.onboardingComplete proprty.
but the PROBLEM is for the state where 
stored onboardingID is complete but user is not authorized, there is no user
probably what i can do is to create onboarding slice and fetch onboarding by id and store it there and rely on it.!!!!