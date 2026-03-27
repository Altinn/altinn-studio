import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';

import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { activeInstancesQuery } from 'src/core/queries/instance/instance.queries';
import { InstantiateContainer } from 'src/features/instantiate/containers/InstantiateContainer';
import { useSelectedParty } from 'src/features/party/PartiesProvider';

const useActiveInstancesQuery = () => {
  const selectedParty = useSelectedParty();
  const partyId = String(selectedParty?.partyId ?? '');

  const utils = useQuery({
    ...activeInstancesQuery(partyId),
    enabled: Boolean(selectedParty?.partyId),
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
