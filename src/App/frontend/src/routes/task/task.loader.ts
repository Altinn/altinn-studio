import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { prefetchInstanceData } from 'src/core/queries/instance';

export function taskLoader(queryClient: QueryClient) {
  return function loader({ params }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;

    // Fire-and-forget: warm the cache without blocking route rendering.
    // Instance and process data should already be cached from the parent instance loader.
    if (instanceOwnerPartyId && instanceGuid) {
      prefetchInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid });
    }

    return null;
  };
}
