import React from 'react';
import { Provider } from 'react-redux';
import { App } from './App';
import { run } from './sagas';
import { store } from './store';
import './styles/index.css';

let initializedSagas = false;

export const SubApp = () => {
  if (!initializedSagas) {
    run();
    initializedSagas = true;
  }
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
};
