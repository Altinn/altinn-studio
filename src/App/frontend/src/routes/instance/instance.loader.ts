import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { instanceQueries } from 'src/features/instance/InstanceContext';

export function instanceLoader(queryClient: QueryClient) {
  return function loader({ params }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;

    // Fire-and-forget: warm the cache without blocking route rendering.
    // The route components show their own loading states via <Loader />.
    // Process data is included in the instance response and seeded into the process cache by InstanceProvider.
    if (instanceOwnerPartyId && instanceGuid) {
      queryClient.prefetchQuery(instanceQueries.instanceData({ instanceOwnerPartyId, instanceGuid }));
    }

    return null;
  };
}
