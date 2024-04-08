import React from 'react';
import { App } from './App';
import './styles/index.css';
import { AppContextProvider } from './AppContext';

export const SubApp = () => {
  return (
    <AppContextProvider>
      <App />
    </AppContextProvider>
  );
};
