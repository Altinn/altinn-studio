import type { LoaderFunctionArgs } from 'react-router';

import { prefetchPartiesAllowedToInstantiate } from 'src/core/queries/party';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import type { PartyApi } from 'src/core/api-client/party.api';

export function partySelectionLoader(partyApi: PartyApi) {
  return function loader({ context }: LoaderFunctionArgs) {
    const queryClient = context.get(queryClientContext);
    prefetchPartiesAllowedToInstantiate({ queryClient, partyApi });
    return null;
  };
}
