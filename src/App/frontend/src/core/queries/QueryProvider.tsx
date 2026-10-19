import React, { useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { createContext } from 'src/core/contexts/context';
import { getQueryClient } from 'src/core/queries/queryClient.queries';
import type { AppMutations, AppQueries, AppQueriesContext } from 'src/core/queries/appQueries.types';
import type { AppQueryClient } from 'src/core/queries/queryClient';

export interface AppQueriesProps extends AppQueriesContext {
  queryClient: AppQueryClient;
}

interface ContextData {
  queries: AppQueries;
  mutations: AppMutations;
}

const { Provider, useCtx } = createContext<ContextData>({ name: 'AppQueriesContext', required: true });

export const AppQueriesProvider = ({
  children,
  queryClient,
  ...allQueries
}: React.PropsWithChildren<AppQueriesProps>) => {
  const client = getQueryClient(queryClient);
  const queries = Object.fromEntries(
    Object.entries(allQueries).filter(([key]) => key.startsWith('fetch')),
  ) as AppQueries;
  const mutations = Object.fromEntries(
    Object.entries(allQueries).filter(([key]) => key.startsWith('do')),
  ) as AppMutations;

  // Lets us access the query client from the console, and inject data into the cache (for example for use in
  // Cypress tests)
  useEffect(() => {
    window.queryClient = client;
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <Provider value={{ queries, mutations }}>{children}</Provider>
    </QueryClientProvider>
  );
};

export const useAppQueries = () => useCtx().queries;
export const useAppMutations = () => useCtx().mutations;
