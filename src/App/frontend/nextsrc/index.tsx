import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import '@digdir/designsystemet-css';
import '@digdir/designsystemet-theme';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { FormClient } from 'nextsrc/libs/form-client/form-client';
import { FormClientProvider } from 'nextsrc/libs/form-client/form-context';
import { queryClient } from 'nextsrc/QueryClient';
import { router } from 'nextsrc/router';

import 'src/index.css';

export const formClient = new FormClient();
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <FormClientProvider client={formClient}>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </FormClientProvider>,
  );
}
