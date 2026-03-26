import type { QueryClient } from '@tanstack/react-query';

import { prefetchPartiesAllowedToInstantiate } from 'src/core/queries/party';

export function instanceSelectionLoader(queryClient: QueryClient) {
  return function loader() {
    prefetchPartiesAllowedToInstantiate({ queryClient });
    return null;
  };
}
