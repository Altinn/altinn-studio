import React, { useRef } from 'react';
import { Provider } from 'react-redux';
import { App } from './App';
import { setupStore } from './store';
import './styles/index.css';
import { AppContext } from './AppContext';
import { useReactiveLocalStorage } from 'app-shared/hooks/useReactiveLocalStorage';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

const store = setupStore();

export const SubApp = () => {
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const { app } = useStudioUrlParams();
  const [selectedLayoutSet, setSelectedLayoutSet, removeSelectedLayoutSet] =
    useReactiveLocalStorage('layoutSet/' + app, null);

  return (
    <Provider store={store}>
      <AppContext.Provider
        value={{
          previewIframeRef,
          selectedLayoutSet,
          setSelectedLayoutSet,
          removeSelectedLayoutSet,
        }}
      >
        <App />
      </AppContext.Provider>
    </Provider>
  );
};
