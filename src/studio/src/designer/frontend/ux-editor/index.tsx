import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import AppComponent from './App';
import { run } from './sagas';
import { store } from './store';
import './styles/index.css';

/**
 * This is the Script that starts the React application
 */

/**
 * Setup all Sagas to listen to the defined events
 */
run();

/**
 *
 */
render(
  <Provider store={store}>
    <AppComponent />
  </Provider>,
  document.getElementById('root'),
);
