import React from 'react';
import { createRoot } from 'react-dom/client';
import { PREVIEW_BASENAME } from 'app-shared/constants';
import { AppShell } from 'app-shared/AppShell';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { routes } from './routes/routes';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <AppShell
    basename={PREVIEW_BASENAME}
    routes={routes}
    providers={[PreviewConnectionContextProvider]}
  />,
);
