import type { LoaderFunctionArgs } from 'react-router';

import { prefetchInstanceData } from 'src/core/queries/instance';
import { appQueriesContext } from 'src/routerContexts/appQueriesRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';

export function clientLoader({ params, context }: LoaderFunctionArgs): null {
  const { instanceOwnerPartyId, instanceGuid } = params;
  const queryClient = context.get(queryClientContext);
  const instanceApi = context.get(appQueriesContext);

  if (instanceOwnerPartyId && instanceGuid) {
    prefetchInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid, instanceApi });
  }
  return null;
}
