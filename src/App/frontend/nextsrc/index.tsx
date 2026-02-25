import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { scan } from 'react-scan';

import '@digdir/designsystemet-css';
import '@digdir/designsystemet-theme';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { GlobalData } from 'nextsrc/core/globalData';
import { FormClient } from 'nextsrc/libs/form-client/form-client';
import { FormClientProvider } from 'nextsrc/libs/form-client/react/provider';
import { queryClient } from 'nextsrc/QueryClient';
import { router } from 'nextsrc/router';

import 'src/index.css';

export const formClient = new FormClient({
  textResources: GlobalData.textResources?.resources,
  language: GlobalData.textResources?.language,
  applicationSettings: GlobalData.frontendSettings ?? null,
});

formClient.onFormDataChange((event) => {
  console.log('[form-data-change]', event.path, event.previousValue, '->', event.value);
});

function App() {
  useEffect(() => {
    scan({ enabled: true });
  }, []);

  return (
    <FormClientProvider client={formClient}>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </FormClientProvider>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
