import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { reducer as schemaReducer } from './features/editor/schemaEditorSlice';
import { sagaMiddleware } from './sagas';

export const middlewares = [sagaMiddleware];

export const store: EnhancedStore = configureStore({
  reducer: schemaReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ['payload.onSaveSchema'],
      },
    }).concat(sagaMiddleware),
});
