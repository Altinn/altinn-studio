import React from 'react';
import { Provider } from 'react-redux';
import { App } from './App';
import { store } from './store';
import './styles/index.css';

export const SubApp = () => {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
};
