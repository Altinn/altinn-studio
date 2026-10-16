import { QueryClient } from '@tanstack/react-query';

import { registerQueryClient } from 'src/core/queries/queryClient.queries';

const clientId = Symbol('AppQueryClient');

/** Opaque cache handle passed between the app root, provider, and route loaders. */
export interface AppQueryClient {
  readonly [clientId]: true;
}

function handleFor(client: QueryClient): AppQueryClient {
  const handle: AppQueryClient = { [clientId]: true };
  registerQueryClient(handle, client);
  return handle;
}

declare global {
  interface Window {
    // Exposes our global query client, which is used to cache data from API calls. This is exposed so that Cypress
    // can inject data into the cache, and so that we can access the cache in tests. It is also used by Studio
    // to invalidate/inject layout data when the (Studio) user makes a change to the layout and wants to see the result
    // in the app preview. We cannot simply remove/rename this without making sure the Studio team has a plan to
    // replace that functionality with something else.
    queryClient: QueryClient;
  }
}

/**
 * Query client for the application. Only one instance should be created and shared across the app to maintain a single data cache.
 */
export function createAppQueryClient(): AppQueryClient {
  return handleFor(
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 10 * 60 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    }),
  );
}

/** Isolated caches for test renders and route loader tests. */
export function createTestQueryClient(): AppQueryClient {
  return handleFor(
    new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false, staleTime: Infinity },
      },
    }),
  );
}
