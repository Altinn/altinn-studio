import { configureStore } from '@reduxjs/toolkit';
import schemaReducer from './features/editor/schemaEditorSlice';

export const store = configureStore({
  reducer: schemaReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ['payload.onSaveSchema'],
      },
    }),
});
