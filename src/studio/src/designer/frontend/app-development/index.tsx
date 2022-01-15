import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { run } from './sagas';
import { setupStore } from './store';

const store = setupStore();

/**
 * Setup all Sagas to listen to the defined events
 */
run();

render(
  <Provider store={store}>
    <HashRouter>
      <App />
    </HashRouter>
  </Provider>,
  document.getElementById('root'),
);
