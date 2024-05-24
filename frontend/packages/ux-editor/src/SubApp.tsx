import React from 'react';
import { App } from './App';
import './styles/index.css';
import { AppContextProvider } from './AppContext';

type SubAppProps = {
  appNameHasChanged: boolean;
  setAppNameHasChanged: (hasChanged: boolean) => void;
};

export const SubApp = (props: SubAppProps) => {
  return (
    <AppContextProvider {...props}>
      <App />
    </AppContextProvider>
  );
};
