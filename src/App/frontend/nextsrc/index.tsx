import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormClient } from 'nextsrc/packages/form-client/form-client';
import { FormClientProvider } from 'nextsrc/packages/form-client/form-context';
import { router } from 'nextsrc/router';

export const queryClient = new QueryClient({});
export const formClient = new FormClient();
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <FormClientProvider client={formClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </FormClientProvider>,
  );
}
