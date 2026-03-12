import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { scan } from 'react-scan';

import '@digdir/designsystemet-css';
import '@digdir/designsystemet-theme';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'nextsrc/core/ErrorBoundary';
import { GlobalData } from 'nextsrc/core/globalData';
import { queryClient } from 'nextsrc/core/QueryClient';
import { RootErrorFallback } from 'nextsrc/core/RootErrorFallback';
import { FormClient } from 'nextsrc/libs/form-client/form-client';
import { FormClientProvider } from 'nextsrc/libs/form-client/react/provider';
import { router } from 'nextsrc/router';

import 'nextsrc/index.css';

export const formClient = new FormClient({
  defaultDataType: 'default',
  textResources: GlobalData.textResources?.resources,
  language: GlobalData.textResources?.language,
  applicationSettings: GlobalData.frontendSettings ?? null,
});

function App() {
  useEffect(() => {
    scan({ enabled: true });
  }, []);

  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <RootErrorFallback
          error={error}
          reset={reset}
        />
      )}
    >
      <FormClientProvider client={formClient}>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <RouterProvider router={router} />
        </QueryClientProvider>
      </FormClientProvider>
    </ErrorBoundary>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
