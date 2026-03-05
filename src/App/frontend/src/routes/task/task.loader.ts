import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { instanceQueries } from 'src/features/instance/InstanceContext';
import { processQueries } from 'src/features/instance/useProcessQuery';

export function taskLoader(queryClient: QueryClient) {
  return async function loader({ params }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;
    const instanceId = instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;

    // Instance and process data should already be cached from the parent instance loader,
    // but ensureQueryData is a no-op if data is already fresh.
    await Promise.all([
      queryClient.ensureQueryData(instanceQueries.instanceData({ instanceOwnerPartyId, instanceGuid })),
      queryClient.ensureQueryData(processQueries.processState(instanceId)),
    ]);

    return null;
  };
}
