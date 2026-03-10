import type { QueryClient } from '@tanstack/react-query';

import { fetchPartiesAllowedToInstantiate } from 'src/queries/queries';

export function partySelectionLoader(queryClient: QueryClient) {
  return function loader() {
    queryClient.prefetchQuery({
      queryKey: ['parties', 'allowedToInstantiate'],
      queryFn: fetchPartiesAllowedToInstantiate,
    });
    return null;
  };
}
