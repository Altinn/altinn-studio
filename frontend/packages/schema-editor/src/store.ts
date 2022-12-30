import type { EnhancedStore } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import { reducer } from './features/editor/schemaEditorSlice';
import { sagaMiddleware } from './sagas';

export const store: EnhancedStore = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ['payload.onSaveSchema'],
      },
    }).concat(sagaMiddleware),
});
