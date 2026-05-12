// Needed for "useBuiltIns": "entry" in babel.config.json to resolve
// all the polyfills we need and inject them here
import 'core-js';

import { executeHashRouterRedirect } from 'src/utils/urls/hashRouterRedirect';
const isRedirectingFromHashRoute = executeHashRouterRedirect();

import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import '@digdir/designsystemet-css';
import '@digdir/designsystemet-css/theme';
import 'src/features/baseurlinjection';
import 'src/features/logging';
import 'src/features/styleInjection';
import 'src/features/toggles';

import { createAppQueryClient } from 'src/appQueryClient';
import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { AppQueriesProvider } from 'src/core/contexts/AppQueriesProvider';
import { propagateTraceWhenPdf } from 'src/features/propagateTraceWhenPdf';
import * as queries from 'src/queries/queries';
import { createRouter } from 'src/router';

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'react-toastify/dist/ReactToastify.css';
import 'src/index.css';

const queryClient = createAppQueryClient();

document.addEventListener('DOMContentLoaded', () => {
  if (isRedirectingFromHashRoute) {
    return;
  }
  propagateTraceWhenPdf();

  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(
    <AppQueriesProvider
      queryClient={queryClient}
      {...queries}
    >
      <ErrorBoundary>
        <RouterProvider router={createRouter(queryClient)} />
      </ErrorBoundary>
    </AppQueriesProvider>,
  );
});
