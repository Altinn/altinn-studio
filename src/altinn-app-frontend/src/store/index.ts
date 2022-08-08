import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import createSagaMiddleware from 'redux-saga';
import type { PreloadedState } from '@reduxjs/toolkit';
import type { SagaMiddleware } from 'redux-saga';

import reducers from 'src/reducers';
import { appApi } from 'src/services/AppApi';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
const middlewares = [sagaMiddleware, appApi.middleware];
const actionLog = [];

export const setupStore = (preloadedState?: PreloadedState<RootState>) => {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev && (window as any).Cypress) {
    middlewares.push(() => (next) => (action) => {
      actionLog.push(action);
      return next(action);
    });
  }

  const innerStore = configureStore({
    reducer: reducers,
    devTools: isDev,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: isDev,
        immutableCheck: isDev,
      }).concat(middlewares),
    preloadedState,
  });

  setupListeners(innerStore.dispatch);
  return innerStore;
};

export const store = setupStore();

if (process.env.NODE_ENV === 'development') {
  // Expose store when running in Cypress. This allows for using cy.getReduxState() to run assertions against the redux
  // state at various points in the tests. Testing the state directly might expose problems not easily/visibly testable
  // in the app itself.
  (window as any).reduxStore = store;

  // Expose a log containing all dispatched actions. This is useful when Cypress tests fail, so that we can gather
  // the logged actions to re-construct the redux state history using the redux devtools.
  (window as any).reduxActionLog = actionLog;
}

export type RootState = ReturnType<typeof reducers>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
