import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { designerApi } from 'services/designerApi';
import { rootReducer } from './rootReducer';
import { sagaMiddleware } from './rootSaga';

const middlewares = [sagaMiddleware, designerApi.middleware];

export const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware: () => any[]) =>
    getDefaultMiddleware().concat(middlewares),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
