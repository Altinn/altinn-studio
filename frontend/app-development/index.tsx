import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { run } from './sagas';
import { setupStore } from './store';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import * as queries from 'app-shared/api/queries';
import * as mutations from 'app-shared/api/mutations';
import { PreviewConnectionContextProvider } from "app-shared/providers/PreviewConnectionContext";

const store = setupStore();

/**
 * Setup all Sagas to listen to the defined events
 */
run();

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <Provider store={store}>
    <BrowserRouter basename={APP_DEVELOPMENT_BASENAME}>
      <ServicesContextProvider {...queries} {...mutations}>
        <PreviewConnectionContextProvider>
          <App />
        </PreviewConnectionContextProvider>
      </ServicesContextProvider>
    </BrowserRouter>
  </Provider>
);
