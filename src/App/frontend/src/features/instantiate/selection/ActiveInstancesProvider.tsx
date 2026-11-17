import React from 'react';
import type { PropsWithChildren } from 'react';

import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useActiveInstancesQuery } from 'src/core/queries/instance';
import { InstantiationContainer } from 'src/features/instantiate/containers/InstantiationContainer';

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
    return <InstantiationContainer />;
  }

  return children;
}
