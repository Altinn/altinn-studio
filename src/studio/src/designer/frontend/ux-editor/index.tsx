import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './App';
import { run } from './sagas';
import { store } from './store';
import './styles/index.css';

/**
 * Setup all Sagas to listen to the defined events
 */
run();

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
