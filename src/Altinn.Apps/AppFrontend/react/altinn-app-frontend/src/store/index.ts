import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import reducers from '../reducers';
import { appApi } from 'src/services/AppApi';
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
const middlewares = [sagaMiddleware, appApi.middleware];

export const store = configureStore({
  reducer: reducers,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware: () => any[]) =>
    getDefaultMiddleware().concat(middlewares),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
