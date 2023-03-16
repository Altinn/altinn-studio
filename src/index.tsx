// Needed for "useBuiltIns": "entry" in babel.config.json to resolve
// all the polyfills we need and inject them here
import 'core-js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';

import { AppWrapper } from '@altinn/altinn-design-system';

import { App } from 'src/App';
import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { ThemeWrapper } from 'src/components/ThemeWrapper';
import { initSagas } from 'src/sagas';
import { store } from 'src/store';
import { ExprContextWrapper } from 'src/utils/layout/ExprContext';

import 'src/index.css';

initSagas();

const container = document.getElementById('root');
const root = container && createRoot(container);
root?.render(
  <Provider store={store}>
    <HashRouter>
      <AppWrapper>
        <ThemeWrapper>
          <ErrorBoundary>
            <ExprContextWrapper>
              <App />
            </ExprContextWrapper>
          </ErrorBoundary>
        </ThemeWrapper>
      </AppWrapper>
    </HashRouter>
  </Provider>,
);
