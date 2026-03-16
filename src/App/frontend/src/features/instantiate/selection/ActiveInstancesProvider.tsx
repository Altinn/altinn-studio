import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useActiveInstances as useActiveInstancesQuery } from 'src/core/queries/instance';
import { InstantiateContainer } from 'src/features/instantiate/containers/InstantiateContainer';
import { useSelectedParty } from 'src/features/party/PartiesProvider';

const useActiveInstancesInternal = () => {
  const selectedParty = useSelectedParty();

  const utils = useActiveInstancesQuery({
    partyId: selectedParty?.partyId,
    sortDirection: 'asc',
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
    query: useActiveInstancesInternal,
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
