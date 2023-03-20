import type { PreloadedState } from '@reduxjs/toolkit';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '../reducers';
import { sagaMiddleware } from '../sagas';
import { isProduction } from 'app-shared/utils/is-production';

export const middlewares = [sagaMiddleware];

const reducer = combineReducers({
  ...rootReducer,
});

export const setupStore = (preloadedState?: PreloadedState<RootState>) => {
  const store = configureStore({
    reducer,
    devTools: !isProduction(),
    middleware: (getDefaultMiddleware) => {
      return getDefaultMiddleware({
        serializableCheck: {
          ignoredActionPaths: ['payload.error', 'serviceInformation.error'],
        },
      }).concat(middlewares);
    },
    preloadedState,
  });

  return store;
};

export type RootState = ReturnType<typeof reducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
