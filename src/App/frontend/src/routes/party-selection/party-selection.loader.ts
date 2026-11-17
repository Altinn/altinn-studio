import type { LoaderFunctionArgs } from 'react-router';

import { prefetchPartiesAllowedToInstantiate } from 'src/core/queries/party';
import { appQueriesContext } from 'src/routerContexts/appQueriesRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';

export function clientLoader({ context }: LoaderFunctionArgs): null {
  const queryClient = context.get(queryClientContext);
  const partyApi = context.get(appQueriesContext);
  prefetchPartiesAllowedToInstantiate({ queryClient, partyApi });
  return null;
}
