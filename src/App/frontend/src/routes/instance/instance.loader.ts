import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { prefetchInstanceData } from 'src/core/queries/instance';

export function instanceLoader(queryClient: QueryClient) {
  return function loader({ params }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;

    // Fire-and-forget: warm the cache without blocking route rendering.
    // The route components show their own loading states via <Loader />.
    if (instanceOwnerPartyId && instanceGuid) {
      prefetchInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid });
    }

    return null;
  };
}
