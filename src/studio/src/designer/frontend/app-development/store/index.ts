import type { PreloadedState } from '@reduxjs/toolkit';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { rootReducer } from '../reducers';
import { sagaMiddleware } from '../sagas';
import { appDevelopmentApi } from '../services/appDevelopmentApi';

export const middlewares = [sagaMiddleware, appDevelopmentApi.middleware];

const reducer = combineReducers({
  ...rootReducer,
  [appDevelopmentApi.reducerPath]: appDevelopmentApi.reducer,
});

export const setupStore = (preloadedState?: PreloadedState<RootState>) => {
  const store = configureStore({
    reducer,
    devTools: process.env.NODE_ENV !== 'production',
    middleware: (getDefaultMiddleware) => {
      return getDefaultMiddleware({
        serializableCheck: {
          ignoredActionPaths: ['payload.error', 'serviceInformation.error'],
        },
      }).concat(middlewares);
    },
    preloadedState,
  });
  setupListeners(store.dispatch);

  return store;
};

export type RootState = ReturnType<typeof reducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
