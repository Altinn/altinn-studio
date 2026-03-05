import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { instanceQueries } from 'src/features/instance/InstanceContext';
import { processQueries } from 'src/features/instance/useProcessQuery';

export function taskLoader(queryClient: QueryClient) {
  return function loader({ params }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;
    const instanceId = instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;

    // Fire-and-forget: warm the cache without blocking route rendering.
    // Instance and process data should already be cached from the parent instance loader.
    if (instanceOwnerPartyId && instanceGuid) {
      queryClient.prefetchQuery(instanceQueries.instanceData({ instanceOwnerPartyId, instanceGuid }));
    }
    if (instanceId) {
      queryClient.prefetchQuery(processQueries.processState(instanceId));
    }

    return null;
  };
}
