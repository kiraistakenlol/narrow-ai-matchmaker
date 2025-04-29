import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice'; // Will create this next

export const store = configureStore({
    reducer: {
        auth: authReducer,
        // Add other reducers here as needed
    },
    // Middleware setup can be added here if needed
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 