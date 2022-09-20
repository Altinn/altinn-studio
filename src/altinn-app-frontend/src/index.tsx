import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';

import { AppWrapper } from '@altinn/altinn-design-system';

import { App } from 'src/App';
import ErrorBoundary from 'src/components/ErrorBoundary';
import { ThemeWrapper } from 'src/components/ThemeWrapper';
import { initSagas } from 'src/sagas';
import { store } from 'src/store';

import 'src/index.css';

initSagas();

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <HashRouter>
      <AppWrapper>
        <ThemeWrapper>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ThemeWrapper>
      </AppWrapper>
    </HashRouter>
  </Provider>,
);
