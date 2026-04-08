import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { prefetchInstanceData } from 'src/core/queries/instance';
import type { InstanceApi } from 'src/core/api-client/instance.api';

export function instanceLoader(queryClient: QueryClient, instanceApi: InstanceApi) {
  return function loader({ params }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;

    if (instanceOwnerPartyId && instanceGuid) {
      prefetchInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid, instanceApi });
    }
    return null;
  };
}
