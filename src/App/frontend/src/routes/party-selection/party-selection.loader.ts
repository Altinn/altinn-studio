import type { LoaderFunctionArgs } from 'react-router';

import { prefetchPartiesAllowedToInstantiate } from 'src/core/queries/party';
import { apiClientsContext } from 'src/routerContexts/apiClientRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';

export function partySelectionLoader({ context }: LoaderFunctionArgs): null {
  const queryClient = context.get(queryClientContext);
  const { partyApi } = context.get(apiClientsContext);
  prefetchPartiesAllowedToInstantiate({ queryClient, partyApi });
  return null;
}
