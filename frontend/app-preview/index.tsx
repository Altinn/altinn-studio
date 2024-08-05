import React from 'react';
import { createRoot } from 'react-dom/client';
import { PREVIEW_BASENAME } from 'app-shared/constants';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { AppShell } from 'app-shared/AppShell';
import { Route } from 'react-router-dom';
import { LandingPage } from './src/views/LandingPage';
import { PageLayout } from './src/PageLayout';

const container = document.getElementById('root');
const root = createRoot(container);

const routes = (
  <Route element={<PageLayout />}>
    <Route path='/:org/:app' element={<LandingPage />} />
  </Route>
);

root.render(
  <AppShell
    basename={PREVIEW_BASENAME}
    routes={routes}
    providers={[PreviewConnectionContextProvider]}
  />,
);
