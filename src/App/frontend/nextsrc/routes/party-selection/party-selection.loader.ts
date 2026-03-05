import { prefetchPartiesAllowedToInstantiate } from 'nextsrc/core/queries/parties';
import type { QueryClient } from 'nextsrc/core/queries/types';

export const partySelectionLoader = (queryClient: QueryClient) => () => {
  prefetchPartiesAllowedToInstantiate(queryClient);
  return null;
};
