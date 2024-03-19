import React from 'react';
import { Provider } from 'react-redux';
import { App } from './App';
import { setupStore } from './store';
import './styles/index.css';
import { AppContextProvider } from './AppContext';

const store = setupStore();

export const SubApp = () => {
  return (
    <Provider store={store}>
      <AppContextProvider>
        <App />
      </AppContextProvider>
    </Provider>
  );
};
