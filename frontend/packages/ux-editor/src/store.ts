import createSagaMiddleware from 'redux-saga';
import reducers from './reducers';
import type { IAppState } from './types/global';
import type { SagaMiddleware } from 'redux-saga';
import type { Store } from 'redux';
import { configureStore } from '@reduxjs/toolkit';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
export const store: Store<IAppState> = configureStore({
  reducer: reducers,
  devTools: process.env.NODE_ENV !== 'production',
  middleware(getDefaultMiddleware) {
    return getDefaultMiddleware().concat([sagaMiddleware]);
  },
});
