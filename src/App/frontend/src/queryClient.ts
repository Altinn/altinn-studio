import { QueryClient } from '@tanstack/react-query';

/**
 * Shared query client for the application.
 *
 * Do not use in unit tests — provide your own QueryClient to avoid shared cache issues.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
