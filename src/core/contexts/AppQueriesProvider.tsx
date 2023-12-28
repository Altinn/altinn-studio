import React, { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { createContext } from 'src/core/contexts/context';
import type { AppMutations, AppQueries, AppQueriesContext, EnhancedMutations } from 'src/queries/types';

export interface AppQueriesProps extends AppQueriesContext {
  queryClient?: QueryClient;
}

interface ContextData {
  queries: AppQueries;
  mutations: EnhancedMutations;
}

const { Provider, useCtx } = createContext<ContextData>({ name: 'AppQueriesContext', required: true });

/**
 * This query client should not be used in unit tests, as multiple tests will end up re-using
 * the same query cache. Provide your own when running code in tests.
 */
const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

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

  const enhancedMutations = Object.fromEntries(
    Object.entries(mutations).map(([key, mutation]) => {
      // As long as the queries are all the same each time, this should be fine
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [lastResult, setLastResult] = useState<Awaited<ReturnType<typeof mutation>>>();
      return [key, { call: mutation, lastResult, setLastResult }];
    }),
  ) as EnhancedMutations;

  // Lets us access the query client from the console, and inject data into the cache (for example for use in
  // Cypress tests)
  window.queryClient = queryClient;

  return (
    <QueryClientProvider client={queryClient}>
      <Provider value={{ queries, mutations: enhancedMutations }}>{children}</Provider>
    </QueryClientProvider>
  );
};

export const useAppQueries = () => useCtx().queries;
export const useAppMutations = () => useCtx().mutations;
export const useLastMutationResult = <K extends keyof AppMutations>(
  key: K,
): Awaited<ReturnType<AppMutations[K]>> | undefined => {
  const { lastResult } = useAppMutations()[key];
  return lastResult;
};
