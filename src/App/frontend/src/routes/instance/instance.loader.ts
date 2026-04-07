import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { prefetchInstanceData } from 'src/core/queries/instance';
import { processQueries } from 'src/features/instance/useProcessQuery';
import type { InstanceApi } from 'src/core/api-client/instance.api';

export function instanceLoader(queryClient: QueryClient, instanceApi: InstanceApi) {
  return function loader({ params }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;
    const instanceId = instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;

    // Fire-and-forget: warm the cache without blocking route rendering.
    // The route components show their own loading states via <Loader />.
    if (instanceOwnerPartyId && instanceGuid) {
      prefetchInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid, instanceApi });
    }
    if (instanceId) {
      queryClient.prefetchQuery(processQueries.processState(instanceId));
    }

    return null;
  };
}
