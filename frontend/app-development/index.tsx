import React from 'react';
import { createRoot } from 'react-dom/client';
import { routes } from './routes/routes';
import { AppShell } from 'app-shared/AppShell';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { SettingsModalContextProvider } from './contexts/SettingsModalContext';
import { PreviewContextProvider } from './contexts/PreviewContext';
import { LayoutContextProvider } from './contexts/LayoutContext';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

root.render(
  <AppShell
    basename={APP_DEVELOPMENT_BASENAME}
    routes={routes}
    providers={[SettingsModalContextProvider, PreviewContextProvider, LayoutContextProvider]}
  />,
);
