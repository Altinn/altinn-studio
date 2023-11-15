// Needed for "useBuiltIns": "entry" in babel.config.json to resolve
// all the polyfills we need and inject them here
import 'core-js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';

import 'src/features/toggles';
import 'src/features/logging';
import 'src/features/styleInjection';

import { AppWrapper } from '@altinn/altinn-design-system';

import { App } from 'src/App';
import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { ThemeWrapper } from 'src/components/ThemeWrapper';
import { AppQueriesProvider } from 'src/contexts/appQueriesContext';
import { DevTools } from 'src/features/devtools/DevTools';
import { InstantiationProvider } from 'src/features/instantiate/InstantiationContext';
import * as queries from 'src/queries/queries';
import { initSagas } from 'src/redux/sagas';
import { setupStore } from 'src/redux/store';
import { ExprContextWrapper } from 'src/utils/layout/ExprContext';

import 'src/index.css';

document.addEventListener('DOMContentLoaded', () => {
  const { store, sagaMiddleware } = setupStore();
  initSagas(sagaMiddleware);

  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(
    <Provider store={store}>
      <ErrorBoundary>
        <HashRouter>
          <AppWrapper>
            <AppQueriesProvider {...queries}>
              <ThemeWrapper>
                <InstantiationProvider>
                  <ExprContextWrapper>
                    <DevTools>
                      <App />
                    </DevTools>
                  </ExprContextWrapper>
                </InstantiationProvider>
              </ThemeWrapper>
            </AppQueriesProvider>
          </AppWrapper>
        </HashRouter>
      </ErrorBoundary>
    </Provider>,
  );
});
