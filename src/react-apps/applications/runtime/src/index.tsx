import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { initSagas } from './sagas';
import { store } from './store';
import './styles/index.css';

import ErrorBoundry from './components/ErrorBoundry';

initSagas();

render(
  <Provider store={store}>
    <HashRouter>
      <ErrorBoundry>
        <App />
      </ErrorBoundry>
    </HashRouter>
  </Provider>,
  document.getElementById('root'),
);
