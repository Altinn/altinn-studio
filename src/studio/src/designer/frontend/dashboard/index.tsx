import React from 'react';
import {render} from 'react-dom';
import {HashRouter as Router} from 'react-router-dom';
import {Provider} from 'react-redux';
import throttle from 'lodash-es/throttle';

import {App} from './app/App';
import {run} from './app/rootSaga';
import {setupStore} from './app/store';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
} from 'common/utils/localStorage';

const store = setupStore(loadFromLocalStorage());
store.subscribe(
  throttle(() => {
    saveToLocalStorage(store.getState());
  }, 2000),
);

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
