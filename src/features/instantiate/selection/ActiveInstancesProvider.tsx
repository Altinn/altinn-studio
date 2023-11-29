import React from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { InstantiateContainer } from 'src/features/instantiate/containers/InstantiateContainer';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const useActiveInstancesQuery = () => {
  const { fetchActiveInstances } = useAppQueries();
  const currentParty = useCurrentParty();

  return useQuery({
    queryKey: ['getActiveInstances', currentParty?.partyId],
    queryFn: async () => {
      const simpleInstances = await fetchActiveInstances(currentParty?.partyId ?? '');

      // Sort array by last changed date
      simpleInstances.sort((a, b) => new Date(a.lastChanged).getTime() - new Date(b.lastChanged).getTime());

      return simpleInstances;
    },
    onError: (error: HttpClientError) => {
      window.logErrorOnce('Failed to find any active instances:\n', error);
    },
  });
};

const { Provider, useCtx } = delayedContext(() =>
  createQueryContext({
    name: 'ActiveInstances',
    required: true,
    query: useActiveInstancesQuery,
  }),
);

export const ActiveInstancesProvider = ({ children }: PropsWithChildren) => (
  <Provider>
    <MaybeInstantiate>{children}</MaybeInstantiate>
  </Provider>
);
export const useActiveInstances = () => useCtx();

function MaybeInstantiate({ children }: PropsWithChildren) {
  const instances = useActiveInstances();
  if (instances.length === 0) {
    // If there's no active instances, we should instantiate a new one
    return <InstantiateContainer />;
  }

  return children;
}
