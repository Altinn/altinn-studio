import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import reducers from '../reducers';
import { appApi } from 'src/services/AppApi';
import { configureStore, PreloadedState } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
const middlewares = [sagaMiddleware, appApi.middleware];

export const setupStore = (preloadedState?: PreloadedState<RootState>) => {
  const innerStore = configureStore({
    reducer: reducers,
    devTools: process.env.NODE_ENV !== 'production',
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      // TODO: enable once we have cleaned up our store
      serializableCheck: false,
      immutableCheck: false,
    }).concat(middlewares),
    preloadedState
  });

  setupListeners(innerStore.dispatch);
  return innerStore;
};

export const store = setupStore();

export type RootState = ReturnType<typeof reducers>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
