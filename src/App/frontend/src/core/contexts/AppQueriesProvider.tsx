import React, { useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { createContext } from 'src/core/contexts/context';
import { queryClient as defaultQueryClient } from 'src/queryClient';
import type { AppMutations, AppQueries, AppQueriesContext } from 'src/queries/types';

export interface AppQueriesProps extends AppQueriesContext {
  queryClient?: QueryClient;
}

interface ContextData {
  queries: AppQueries;
  mutations: AppMutations;
}

const { Provider, useCtx } = createContext<ContextData>({ name: 'AppQueriesContext', required: true });

export const AppQueriesProvider = ({
  children,
  queryClient = defaultQueryClient,
  ...allQueries
}: React.PropsWithChildren<AppQueriesProps>) => {
  const queries = Object.fromEntries(
    Object.entries(allQueries).filter(([key]) => key.startsWith('fetch')),
  ) as AppQueries;
  const mutations = Object.fromEntries(
    Object.entries(allQueries).filter(([key]) => key.startsWith('do')),
  ) as AppMutations;

  // Lets us access the query client from the console, and inject data into the cache (for example for use in
  // Cypress tests)
  useEffect(() => {
    window.queryClient = queryClient;
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Provider value={{ queries, mutations }}>{children}</Provider>
    </QueryClientProvider>
  );
};

export const useAppQueries = () => useCtx().queries;
export const useAppMutations = () => useCtx().mutations;
