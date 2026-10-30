import 'core-js';

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
import { AppQueriesProvider } from 'src/core/queries/AppQueriesProvider';
import * as queries from 'src/core/queries/queries';
import { createAppQueryClient } from 'src/core/queries/queryClient';
import { applyFontFromUrl } from 'src/features/devtools/utils/devFont';
import { propagateTraceWhenPdf } from 'src/features/propagateTraceWhenPdf';
import { createRouter } from 'src/router';
import { executeHashRouterRedirect } from 'src/utils/urls/hashRouterRedirect';

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'react-toastify/dist/ReactToastify.css';
import 'src/index.css';
import 'src/styles/shared.css';

// Bundles the core-js polyfills into the app, so it works in older browsers

const isRedirectingFromHashRoute = executeHashRouterRedirect();

// Temporary font switch for PDF and screenshot comparisons. See #19944.
applyFontFromUrl();

const queryClient = createAppQueryClient();

function renderApp() {
  if (isRedirectingFromHashRoute) {
    return;
  }
  propagateTraceWhenPdf();

  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(
    <AppQueriesProvider
      {...queries}
      queryClient={queryClient}
    >
      <ErrorBoundary>
        <RouterProvider router={createRouter({ queryClient, queries })} />
      </ErrorBoundary>
    </AppQueriesProvider>,
  );
}

// In production the bundle is a classic script that executes before DOMContentLoaded, but in
// dev mode the code is loaded asynchronously from the Vite dev server, so DOMContentLoaded
// may already have fired by the time we get here.
if (document.readyState !== 'loading') {
  renderApp();
} else {
  document.addEventListener('DOMContentLoaded', renderApp);
}
