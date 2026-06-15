import type { LoaderFunctionArgs } from 'react-router';

import { prefetchInstanceData } from 'src/core/queries/instance';
import { apiClientsContext } from 'src/routerContexts/apiClientRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';

export function instanceLoader({ params, context }: LoaderFunctionArgs): null {
  const { instanceOwnerPartyId, instanceGuid } = params;
  const queryClient = context.get(queryClientContext);
  const { instanceApi } = context.get(apiClientsContext);

  if (instanceOwnerPartyId && instanceGuid) {
    prefetchInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid, instanceApi });
  }
  return null;
}
