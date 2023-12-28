import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import createSagaMiddleware from 'redux-saga';
import type { Middleware } from '@reduxjs/toolkit';
import type { PreloadedState } from 'redux';
import type { SagaMiddleware } from 'redux-saga';

import { combinedReducers } from 'src/redux/reducers';

export const setupStore = (preloadedState?: PreloadedState<RootState>) => {
  const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
  const middlewares: Middleware[] = [sagaMiddleware];

  const isDev = process.env.NODE_ENV !== 'production';
  const store = configureStore({
    reducer: combinedReducers(),
    devTools: true,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: isDev,
        immutableCheck: isDev,
      }).concat(middlewares),
    preloadedState,
  });

  setupListeners(store.dispatch);
  window.reduxStore = store;

  return { store, sagaMiddleware };
};

export type RootState = ReturnType<ReturnType<typeof combinedReducers>>;
export type AppStore = ReturnType<typeof setupStore>['store'];
export type AppDispatch = AppStore['dispatch'];
