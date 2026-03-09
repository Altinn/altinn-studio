import { prefetchPartiesAllowedToInstantiate } from 'nextsrc/core/queries/parties';
import type { QueryClient } from '@tanstack/react-query';

export const partySelectionLoader = (queryClient: QueryClient) => () => {
  prefetchPartiesAllowedToInstantiate(queryClient);
  return null;
};
