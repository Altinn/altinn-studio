import React, { useRef } from 'react';
import { Provider } from 'react-redux';
import { App } from './App';
import { store } from './store';
import './styles/index.css';
import { AppContext } from './AppContext';

export const SubApp = () => {
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  return (
    <Provider store={store}>
      <AppContext.Provider value={{ previewIframeRef }}>
        <App />
      </AppContext.Provider>
    </Provider>
  );
};
