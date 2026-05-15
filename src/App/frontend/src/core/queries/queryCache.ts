import { useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';

/**
 * Minimal query-cache observer API for code outside src/core/queries.
 * Consumers can react to cache changes without depending on TanStack Query types or client methods directly.
 */
export interface QueryCacheObserver {
  subscribe: (onChange: () => void) => () => void;
}

export function useQueryCacheObserver(): QueryCacheObserver {
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      subscribe: (onChange) => queryClient.getQueryCache().subscribe(onChange),
    }),
    [queryClient],
  );
}
