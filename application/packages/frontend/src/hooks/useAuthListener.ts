import { useEffect } from 'react';
import { Hub } from 'aws-amplify/utils';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useAppDispatch } from './hooks';
import { checkAuth, resetAuth } from '../state/slices/authSlice';
import apiClient from '../lib/apiClient';
import { UserDto } from '@narrow-ai-matchmaker/common';
import { STORAGE_KEYS } from '../constants/storage';

export function useAuthListener() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(checkAuth());

        const unsubscribe = Hub.listen('auth', ({ payload }) => {
            
            switch (payload.event) {
                case 'signedIn':
                    console.log('Amplify Hub: signedIn event detected.');
                    dispatch(checkAuth());
                    break;

                case 'signInWithRedirect':
                    console.log('Amplify Hub: signInWithRedirect event detected.');
                    const syncBackend = async () => {
                        try {
                            const session = await fetchAuthSession({ forceRefresh: false });
                            const idToken = session.tokens?.idToken?.toString();
                            if (idToken) {
                                console.log('useAuthListener: Got idToken, calling POST /auth...');
                                try {
                                    const onboardingId = localStorage.getItem(STORAGE_KEYS.ONBOARDING_ID);
                                    await apiClient.post<UserDto>('/auth', {
                                            id_token: idToken,
                                            onboarding_id: onboardingId
                                        });
                                    console.log('useAuthListener: POST /auth successful.');
                                } catch (authError) {
                                    console.error('useAuthListener: POST /auth failed.', authError);
                                }
                            } else {
                                console.warn('useAuthListener: signInWithRedirect detected but no idToken found.');
                            }
                        } catch (sessionError) {
                            console.error('useAuthListener: Error fetching session after signInWithRedirect.', sessionError);
                        }
                        console.log('useAuthListener: Dispatching checkAuth after backend sync attempt.');
                        dispatch(checkAuth());
                    };
                    syncBackend();
                    break;

                case 'signedOut':
                    console.log('Amplify Hub: signedOut event detected.');
                    dispatch(resetAuth());
                    break;

                case 'signInWithRedirect_failure':
                    console.error('Amplify Hub: Sign in with redirect failed', payload.data);
                    break;

                default:
                    break;
            }
        });

        return () => {
            console.log('Cleaning up Amplify Hub listener.');
            unsubscribe();
        }
    }, [dispatch]);
} 