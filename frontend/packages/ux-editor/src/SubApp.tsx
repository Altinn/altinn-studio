import React from 'react';
import { App } from './App';
import './styles/index.css';
import { AppContextProvider } from './AppContext';

type SubAppProps = {
  shouldReloadPreview: boolean;
  previewHasLoaded: () => void;
};

export const SubApp = (props: SubAppProps) => {
  return (
    <AppContextProvider {...props}>
      <App />
    </AppContextProvider>
  );
};
