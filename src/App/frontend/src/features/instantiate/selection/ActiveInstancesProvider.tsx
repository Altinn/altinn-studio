import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { InstantiateContainer } from 'src/features/instantiate/containers/InstantiateContainer';
import { useSelectedParty } from 'src/features/party/PartiesProvider';

const useActiveInstancesQuery = () => {
  const { fetchActiveInstances } = useAppQueries();
  const selectedParty = useSelectedParty();

  const utils = useQuery({
    queryKey: ['getActiveInstances', selectedParty?.partyId],
    queryFn: async () => {
      const simpleInstances = await fetchActiveInstances(selectedParty?.partyId ?? -1);

      // Sort array by last changed date
      simpleInstances.sort((a, b) => new Date(a.lastChanged).getTime() - new Date(b.lastChanged).getTime());

      return simpleInstances;
    },
  });

  useEffect(() => {
    utils.error && window.logError('Fetching active instances failed:\n', utils.error);
  }, [utils.error]);

  return utils;
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
