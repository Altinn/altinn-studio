import type { QueryClient } from '@tanstack/react-query';

import { prefetchPartiesAllowedToInstantiate } from 'src/core/queries/party';

export function partySelectionLoader(queryClient: QueryClient) {
  return function loader() {
    prefetchPartiesAllowedToInstantiate({ queryClient });
    return null;
  };
}
