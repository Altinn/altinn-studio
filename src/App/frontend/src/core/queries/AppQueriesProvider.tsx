import React, { useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { createContext } from 'src/core/contexts/context';
import { getQueryClient } from 'src/core/queries/queryClient.queries';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import type { AppQueryClient } from 'src/core/queries/queryClient';
import type { AppMutations, AppQueries, AppQueriesContext } from 'src/core/queries/types';

export interface AppQueriesProps extends AppQueriesContext {
  queryClient: AppQueryClient;
}

interface ContextData {
  queryClient: AppQueryClient;
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
    Object.entries(allQueries).filter(([key]) => key.startsWith('fetch') || key.startsWith('get')),
  ) as AppQueries;
  const mutations = Object.fromEntries(
    Object.entries(allQueries).filter(
      ([key]) => key.startsWith('do') || key.startsWith('create') || key.startsWith('set'),
    ),
  ) as AppMutations;

  // Lets us access the query client from the console, and inject data into the cache (for example for use in
  // Cypress tests)
  useEffect(() => {
    window.queryClient = client;
  }, [client]);

  // Expression readers cache against the request records; preserve their identity until a function changes.
  const value = useShallowMemo({
    queryClient,
    queries: useShallowMemo(queries),
    mutations: useShallowMemo(mutations),
  });

  return (
    <QueryClientProvider client={client}>
      <Provider value={value}>{children}</Provider>
    </QueryClientProvider>
  );
};

export const useAppQueries = () => useCtx().queries;
export const useAppMutations = () => useCtx().mutations;
export const useAppQueryClient = () => useCtx().queryClient;
