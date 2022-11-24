import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { run } from './sagas';
import { setupStore } from './store';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

const store = setupStore();

/**
 * Setup all Sagas to listen to the defined events
 */
run();

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <Provider store={store}>
    <BrowserRouter basename={APP_DEVELOPMENT_BASENAME}>
      <App />
    </BrowserRouter>
  </Provider>
);
