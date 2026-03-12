import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { ensureInstanceData } from 'src/core/queries/instance';

export function instanceLoader(queryClient: QueryClient) {
  return async function loader({ params }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;

    if (instanceOwnerPartyId && instanceGuid) {
      await ensureInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid });
    }

    return null;
  };
}
