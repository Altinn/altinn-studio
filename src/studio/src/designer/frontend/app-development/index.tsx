import React from 'react';
import {render} from 'react-dom';
import {Provider} from 'react-redux';
import App from './App';
import {run} from './sagas';
import {setupStore} from './store';
import {HashRouter as Router} from 'react-router-dom';

const store = setupStore();

/**
 * Setup all Sagas to listen to the defined events
 */
run();

render(
  <Provider store={store}>
    <Router>
      <App/>
    </Router>
  </Provider>,
  document.getElementById('root'),
);
