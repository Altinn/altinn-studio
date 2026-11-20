import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

export function useWaitForQueries() {
  const queryClient = useQueryClient();
  return useCallback(
    async (): Promise<void> =>
      new Promise((resolve) => {
        const checkQueries = () => {
          const isFetching = queryClient.isFetching() > 0;
          const isMutating = queryClient.isMutating() > 0;

          if (!isFetching && !isMutating) {
            resolve();
          } else {
            setTimeout(checkQueries, 10);
          }
        };

        checkQueries();
      }),
    [queryClient],
  );
}
