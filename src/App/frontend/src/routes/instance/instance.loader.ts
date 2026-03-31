import type { LoaderFunctionArgs } from 'react-router';

import { prefetchInstanceData } from 'src/core/queries/instance';
import { processQueries } from 'src/features/instance/useProcessQuery';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';

export function instanceLoader({ params, context }: LoaderFunctionArgs) {
  const queryClient = context.get(queryClientContext);
  const { instanceOwnerPartyId, instanceGuid } = params;
  const instanceId = instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;

  // Fire-and-forget: warm the cache without blocking route rendering.
  // The route components show their own loading states via <Loader />.
  if (instanceOwnerPartyId && instanceGuid) {
    prefetchInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid });
  }
  if (instanceId) {
    queryClient.prefetchQuery(processQueries.processState(instanceId));
  }

  return null;
}
