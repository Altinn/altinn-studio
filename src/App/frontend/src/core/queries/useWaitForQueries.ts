import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import type { MutationFilters, QueryFilters } from '@tanstack/react-query';

interface WaitForQueriesOptions {
  queryFilters?: QueryFilters;
  mutationFilters?: MutationFilters;
}

export function useWaitForQueries(options?: WaitForQueriesOptions) {
  const queryClient = useQueryClient();
  return useCallback(
    async (): Promise<void> =>
      new Promise((resolve) => {
        const checkQueries = () => {
          const isFetching = queryClient.isFetching(options?.queryFilters) > 0;
          const isMutating = queryClient.isMutating(options?.mutationFilters) > 0;

          if (!isFetching && !isMutating) {
            resolve();
          } else {
            setTimeout(checkQueries, 10);
          }
        };

        checkQueries();
      }),
    [queryClient, options?.queryFilters, options?.mutationFilters],
  );
}
