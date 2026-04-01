import type { QueryClient } from '@tanstack/react-query';

import { prefetchPartiesAllowedToInstantiate } from 'src/core/queries/party';
import type { PartyApi } from 'src/core/api-client/party.api';

export function instanceSelectionLoader(queryClient: QueryClient, partyApi: PartyApi) {
  return function loader() {
    prefetchPartiesAllowedToInstantiate({ queryClient, partyApi });
    return null;
  };
}
