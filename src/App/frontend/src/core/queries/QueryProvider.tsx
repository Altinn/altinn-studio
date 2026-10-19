import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { getQueryClient } from 'src/core/queries/queryClient.queries';
import type { AppQueryClient } from 'src/core/queries/queryClient';

export function AppQueryProvider({ children, queryClient }: PropsWithChildren<{ queryClient: AppQueryClient }>) {
  const client = getQueryClient(queryClient);
  useEffect(() => {
    window.queryClient = client;
  }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
