import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { fetchFreshInstanceData } from 'src/core/queries/instance';

export type InstanceLoaderResult = null | { error: Error };

export function instanceLoader(queryClient: QueryClient) {
  return async function loader({ params }: LoaderFunctionArgs): Promise<InstanceLoaderResult> {
    const { instanceOwnerPartyId, instanceGuid } = params;

    if (instanceOwnerPartyId && instanceGuid) {
      try {
        await fetchFreshInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid });
      } catch (error) {
        return { error: error instanceof Error ? error : new Error(String(error)) };
      }
    }

    return null;
  };
}
