import React from 'react';
import { createRoot } from 'react-dom/client';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { PageRoutes } from './router/PageRoutes';
import { AppDevelopmentContextProvider } from './contexts/AppDevelopmentContext';
import { AppShell } from 'app-shared/AppShell';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

root.render(
  <AppShell>
    <PreviewConnectionContextProvider>
      <AppDevelopmentContextProvider>
        <PageRoutes />
      </AppDevelopmentContextProvider>
    </PreviewConnectionContextProvider>
  </AppShell>,
);
