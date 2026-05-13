import type { LoaderFunctionArgs } from 'react-router';

import { ensureInstanceData } from 'src/core/queries/instance';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import type { InstanceApi } from 'src/core/api-client/instance.api';

export function taskLoader(instanceApi: InstanceApi) {
  return async function loader({ context, params }: LoaderFunctionArgs) {
    const queryClient = context.get(queryClientContext);
    const { instanceOwnerPartyId, instanceGuid } = params;
    // Await cache freshness before the route renders, so URL and cache transition together.
    // With staleTime: Infinity on the instance query this is a no-op when the cache is already
    // populated by the parent instance loader or a prior mutation/setQueryData; only a missing
    // or invalidated cache triggers a fetch.
    if (instanceOwnerPartyId && instanceGuid) {
      await ensureInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid, instanceApi });
    }
    return null;
  };
}
