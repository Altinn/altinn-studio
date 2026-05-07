import type { LoaderFunctionArgs } from 'react-router';

import { prefetchInstanceData } from 'src/core/queries/instance';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import type { InstanceApi } from 'src/core/api-client/instance.api';

export function instanceLoader(instanceApi: InstanceApi) {
  return function loader({ params, context }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;
    const queryClient = context.get(queryClientContext);

    if (instanceOwnerPartyId && instanceGuid) {
      prefetchInstanceData(queryClient, { instanceOwnerPartyId, instanceGuid, instanceApi });
    }
    return null;
  };
}
