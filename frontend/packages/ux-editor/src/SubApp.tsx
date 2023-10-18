import React, { useRef } from 'react';
import { Provider } from 'react-redux';
import { App } from './App';
import { store } from './store';
import './styles/index.css';
import { AppContext } from './AppContext';
import { useLocalStorage } from 'app-shared/hooks/useLocalStorage';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const SubApp = () => {
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const { app } = useStudioUrlParams();
  const [selectedLayoutSet, setSelectedLayoutSet, removeSelectedLayoutSet] = useLocalStorage('layoutSet/' + app, null);

  return (
    <Provider store={store}>
      <AppContext.Provider value={{ previewIframeRef, selectedLayoutSet, setSelectedLayoutSet, removeSelectedLayoutSet }}>
        <App />
      </AppContext.Provider>
    </Provider>
  );
};
