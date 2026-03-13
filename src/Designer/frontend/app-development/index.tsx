import React from 'react';
import { createRoot } from 'react-dom/client';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { AppShell } from 'app-shared/AppShell';
import { routes } from './routes/routes';
import { LayoutContextProvider } from './contexts/LayoutContext';
import { PreviewContextProvider } from './contexts/PreviewContext';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

root.render(
  <AppShell
    basename={APP_DEVELOPMENT_BASENAME}
    routes={routes}
    providers={[PreviewConnectionContextProvider, PreviewContextProvider, LayoutContextProvider]}
  />,
);
