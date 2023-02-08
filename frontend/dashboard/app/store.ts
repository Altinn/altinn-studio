import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { rootReducer } from './rootReducer';
import { sagaMiddleware } from './rootSaga';
import type { PreloadedState } from '@reduxjs/toolkit';
import { designerApi } from '../services/designerApi';
import { isProduction } from 'app-shared/utils/is-production';

export const middlewares = [sagaMiddleware, designerApi.middleware];

const reducer = combineReducers(rootReducer);

export const setupStore = (preloadedState?: PreloadedState<RootState>) => {
  const store = configureStore({
    reducer,
    devTools: !isProduction(),
    middleware: (getDefaultMiddleware: () => any[]) => getDefaultMiddleware().concat(middlewares),
    preloadedState,
  });
  setupListeners(store.dispatch);

  return store;
};

export type RootState = ReturnType<typeof reducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
