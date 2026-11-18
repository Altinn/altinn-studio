import React, { useEffect, useMemo } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { createContext } from 'src/core/contexts/context';
import { createExpressionQueryReaders } from 'src/core/queries/expressionQueryReaders.queries';
import { getQueryClient } from 'src/core/queries/queryClient.queries';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import type { ExpressionQueryReaders } from 'src/core/queries/expressionQueryReaders';
import type { AppQueryClient } from 'src/core/queries/queryClient';
import type { AppMutations, AppQueries, AppQueriesContext } from 'src/core/queries/types';

export interface AppQueriesProps extends AppQueriesContext {
  queryClient: AppQueryClient;
}

interface ContextData {
  queryClient: AppQueryClient;
  queries: AppQueries;
  mutations: AppMutations;
  expressionQueryReaders: ExpressionQueryReaders;
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

  const { fetchExternalApi, fetchTextResources } = queries;
  // Share readers and their subscriptions within this provider, independent of unrelated request changes.
  const expressionQueryReaders = useMemo(
    () => createExpressionQueryReaders(client, { fetchExternalApi, fetchTextResources }),
    [client, fetchExternalApi, fetchTextResources],
  );
  const value = useShallowMemo({
    queryClient,
    queries: useShallowMemo(queries),
    mutations: useShallowMemo(mutations),
    expressionQueryReaders,
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
export const useExpressionQueryReaders = () => useCtx().expressionQueryReaders;
