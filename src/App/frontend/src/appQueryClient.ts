import { QueryClient } from '@tanstack/react-query';

/**
 * Query client for the application. Only one instance should be created and shared across the app to maintain a single data cache.
 */
export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}
