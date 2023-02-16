import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import createSagaMiddleware from 'redux-saga';
import type { PreloadedState } from 'redux';
import type { SagaMiddleware } from 'redux-saga';

import { combinedReducers } from 'src/reducers';
import { appApi } from 'src/services/AppApi';
import type { IAltinnWindow } from 'src/types';

export const sagaMiddleware: SagaMiddleware<any> = createSagaMiddleware();
const middlewares = [sagaMiddleware, appApi.middleware];
const actionLog: any[] = [];

export const setupStore = (preloadedState?: PreloadedState<RootState>) => {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev && (window as any).Cypress) {
    middlewares.push(() => (next) => (action) => {
      actionLog.push(action);
      return next(action);
    });
  }

  const innerStore = configureStore({
    reducer: combinedReducers,
    devTools: true,
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

// Expose store globally. This allows for
// 1. Using cy.getReduxState() in Cypress to run assertions against the redux state at various points in the tests,
//    and inject actions when we need to. Testing the state directly might expose problems not easily/visibly testable
//    in the app itself.
// 2. Allows the window.evalExpression() test-function to get the current state for testing expressions.
(window as unknown as IAltinnWindow).reduxStore = store;

if (process.env.NODE_ENV === 'development') {
  // Expose a log containing all dispatched actions. This is useful when Cypress tests fail, so that we can gather
  // the logged actions to re-construct the redux state history using the redux devtools.
  (window as unknown as IAltinnWindow).reduxActionLog = actionLog;
}

export type RootState = ReturnType<typeof combinedReducers>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
