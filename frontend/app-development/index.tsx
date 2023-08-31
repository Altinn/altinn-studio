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
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import 'app-shared/design-tokens';
import { LoggerConfig, LoggerContextProvider } from 'app-shared/contexts/LoggerContext';
import 'app-shared/design-tokens';
import { altinnStudioWindow } from 'app-shared/utils/altinnStudioWindow';

const store = setupStore();

const loggerConfig: LoggerConfig = {
  instrumentationKey: altinnStudioWindow.instrumentationKey,
  enableUnhandledPromiseRejectionTracking: true,
  loggingLevelTelemetry: 2,
};

/**
 * Setup all Sagas to listen to the defined events
 */
run();

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

root.render(
  <LoggerContextProvider config={loggerConfig}>
    <Provider store={store}>
      <BrowserRouter basename={APP_DEVELOPMENT_BASENAME}>
        <ServicesContextProvider {...queries} {...mutations}>
          <PreviewConnectionContextProvider>
            <App />
          </PreviewConnectionContextProvider>
        </ServicesContextProvider>
      </BrowserRouter>
    </Provider>
  </LoggerContextProvider>
);
