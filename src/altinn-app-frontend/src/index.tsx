import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';

import { App } from 'src/App';
import ErrorBoundary from 'src/components/ErrorBoundary';
import { initSagas } from 'src/sagas';
import { store } from 'src/store';

import 'src/index.css';

initSagas();

render(
  <Provider store={store}>
    <HashRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HashRouter>
  </Provider>,
  document.getElementById('root'),
);
