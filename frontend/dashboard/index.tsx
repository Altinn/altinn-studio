import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import throttle from 'lodash-es/throttle';
import { DASHBOARD_BASENAME } from 'app-shared/constants';
import { App } from './app/App';
import { run } from './app/rootSaga';
import { loadFromLocalStorage, saveToLocalStorage } from './utils/localStorageUtils';
import { setupStore } from './app/store';

const store = setupStore(loadFromLocalStorage());
store.subscribe(
  throttle(() => {
    saveToLocalStorage(store.getState());
  }, 2000)
);

/**
 * Setup all Sagas to listen to the defined events
 */
run();

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <Provider store={store}>
    <BrowserRouter basename={DASHBOARD_BASENAME}>
      <App />
    </BrowserRouter>
  </Provider>
);
