import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { ensureInstanceData } from 'src/core/queries/instance';

export function taskLoader(queryClient: QueryClient) {
  return async function loader({ params }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;

    // Instance data should already be cached from the parent instance loader,
    // so ensureQueryData will resolve immediately from cache.
    if (instanceOwnerPartyId && instanceGuid) {
      await ensureInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid });
    }

    return null;
  };
}
