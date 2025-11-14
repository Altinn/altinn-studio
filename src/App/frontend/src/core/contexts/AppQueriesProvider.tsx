import React, { useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { createContext } from 'src/core/contexts/context';
import { instanceQueries } from 'src/features/instance/InstanceContext';
import { defaultQueryClient } from 'src/index';
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

  // Preload instance data synchronously before first render to prevent query from fetching
  // This runs inside the component (not at module level) so all dependencies are initialized
  if (window.AltinnAppData?.instance) {
    const [instanceOwnerPartyId, instanceGuid] = window.AltinnAppData.instance.id.split('/');
    if (instanceOwnerPartyId && instanceGuid) {
      const queryKey = instanceQueries.instanceData({ instanceOwnerPartyId, instanceGuid }).queryKey;
      if (!queryClient.getQueryData(queryKey)) {
        queryClient.setQueryData(queryKey, window.AltinnAppData.instance);
      }
    }
  }

  // Preload application metadata into query cache from window data
  if (window.AltinnAppData?.applicationMetadata) {
    if (!queryClient.getQueryData(['fetchApplicationMetadata'])) {
      queryClient.setQueryData(['fetchApplicationMetadata'], window.AltinnAppData.applicationMetadata);
    }
  }

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
