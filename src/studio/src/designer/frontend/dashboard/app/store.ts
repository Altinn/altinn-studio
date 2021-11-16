import { configureStore } from '@reduxjs/toolkit';

import { rootReducer } from './rootReducer';
import { sagaMiddleware } from './rootSaga';

const middlewares = [sagaMiddleware];

export const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware: () => any[]) =>
    getDefaultMiddleware().concat(middlewares),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
