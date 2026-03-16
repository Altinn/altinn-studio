import React from 'react';
import './App.css';
import { createRoot } from 'react-dom/client';
import { PreviewApp } from './src/PreviewApp';
import { BrowserRouter } from 'react-router-dom';
import { PREVIEW_BASENAME } from 'app-shared/constants';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import * as queries from 'app-shared/api/queries';
import * as mutations from 'app-shared/api/mutations';
import 'app-shared/design-tokens';
import { EnvironmentConfigProvider } from 'app-shared/contexts/EnvironmentConfigContext/EnvironmentConfigContext';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <ServicesContextProvider {...queries} {...mutations}>
    <EnvironmentConfigProvider>
      <PreviewConnectionContextProvider>
        <BrowserRouter basename={PREVIEW_BASENAME}>
          <PreviewApp />
        </BrowserRouter>
      </PreviewConnectionContextProvider>
    </EnvironmentConfigProvider>
  </ServicesContextProvider>,
);
