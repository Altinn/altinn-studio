import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { initSagas } from './redux/sagas';
import { store } from './redux/store';
import 'core-js/es';
import './styles/index.css';

import ErrorBoundary from './components/ErrorBoundary';

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
