import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
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
    <App />
  </Provider>,
  document.getElementById('root'),
);
