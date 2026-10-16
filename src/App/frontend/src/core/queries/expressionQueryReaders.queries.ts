import type { QueryClient } from '@tanstack/react-query';

import type { QueryCacheObserver } from 'src/core/queries/expressionQueryReaders';
export function createQueryCacheObserver(queryClient: QueryClient): QueryCacheObserver {
  const listeners = new Set<() => void>();
  let unsubscribeCache: (() => void) | undefined;

  return {
    subscribe: (onChange) => {
      listeners.add(onChange);
      unsubscribeCache ??= queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== 'added' && event.type !== 'updated' && event.type !== 'removed') {
          return;
        }
        listeners.forEach((listener) => listener());
      });

      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
          unsubscribeCache?.();
          unsubscribeCache = undefined;
        }
      };
    },
  };
}
