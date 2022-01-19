import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { rootReducer } from '../reducers';
import { sagaMiddleware } from '../sagas';
import type { PreloadedState } from '@reduxjs/toolkit';

export const middlewares = [sagaMiddleware];

const reducer = combineReducers(rootReducer);

export const setupStore = (preloadedState?: PreloadedState<RootState>) => {
  const store = configureStore({
    reducer,
    devTools: process.env.NODE_ENV !== 'production',
    middleware: (getDefaultMiddleware: () => any[]) =>
      getDefaultMiddleware().concat(middlewares),
    preloadedState,
  });
  setupListeners(store.dispatch);

  return store;
};

export type RootState = ReturnType<typeof reducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
