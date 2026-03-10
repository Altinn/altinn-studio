// Needed for "useBuiltIns": "entry" in babel.config.json to resolve
// all the polyfills we need and inject them here
import 'core-js';

import { executeHashRouterRedirect } from 'src/utils/urls/hashRouterRedirect';
if (executeHashRouterRedirect()) {
  throw new Error('HashRouterRedirect: Redirecting to browser-router route');
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import '@digdir/designsystemet-css';
import '@digdir/designsystemet-css/theme';
import 'src/features/baseurlinjection';
import 'src/features/logging';
import 'src/features/styleInjection';
import 'src/features/toggles';

import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { AppQueriesProvider } from 'src/core/contexts/AppQueriesProvider';
import { propagateTraceWhenPdf } from 'src/features/propagateTraceWhenPdf';
import * as queries from 'src/queries/queries';
import { queryClient } from 'src/queryClient';
import { createRouter } from 'src/router';

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'react-toastify/dist/ReactToastify.css';
import 'src/index.css';

document.addEventListener('DOMContentLoaded', () => {
  propagateTraceWhenPdf();

  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(
    <AppQueriesProvider {...queries}>
      <ErrorBoundary>
        <RouterProvider router={createRouter(queryClient)} />
      </ErrorBoundary>
    </AppQueriesProvider>,
  );
});
