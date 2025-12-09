import type { LoaderFunctionArgs } from 'react-router-dom';

import type { QueryClient } from '@tanstack/react-query';

import { formDataQueryOptions } from 'src/http-client/api-client/queries/formData';
import {
  instanceDataKeys,
  instanceDataQueryOptions,
  type InstanceDataResponse,
} from 'src/http-client/api-client/queries/instanceData';
import { layoutsKeys } from 'src/http-client/api-client/queries/layouts';

interface InstanceLoaderProps extends LoaderFunctionArgs {
  context: {
    queryClient: QueryClient;
  };
}

// Track if initial window data has been used
let initialInstanceDataConsumed = false;

export async function instanceLoader({ context, params }: InstanceLoaderProps): Promise<unknown> {
  const { queryClient } = context;
  const { instanceOwnerPartyId, instanceGuid, taskId, pageKey } = params;

  if (!instanceOwnerPartyId || !instanceGuid) {
    throw new Error('instanceOwnerPartyId and instanceGuid are required');
  }

  const queryKey = instanceDataKeys.detail({ instanceOwnerPartyId, instanceGuid });
  let instance: InstanceDataResponse | undefined;

  // 1. Load instance data
  if (!initialInstanceDataConsumed && window.AltinnAppInstanceData?.instance) {
    instance = window.AltinnAppInstanceData.instance as InstanceDataResponse;
    queryClient.setQueryData(queryKey, instance);
    initialInstanceDataConsumed = true;
  } else {
    // Route change: fetch fresh data from API
    instance = await queryClient.fetchQuery(instanceDataQueryOptions({ instanceOwnerPartyId, instanceGuid }));
  }

  // 2. Load form data for current task
  if (instance && taskId) {
    const layoutSets = window.AltinnAppInstanceData?.layoutSets;
    const currentLayoutSet = layoutSets?.sets.find((set) => set.tasks?.includes(taskId));

    if (currentLayoutSet?.dataType) {
      const dataElement = instance.data.find((el) => el.dataType === currentLayoutSet.dataType);

      if (dataElement) {
        const instanceId = `${instanceOwnerPartyId}/${instanceGuid}`;
        const formDataUrl = `/instances/${instanceId}/data/${dataElement.id}`;

        // Block until form data is loaded
        await queryClient.fetchQuery(formDataQueryOptions({ url: formDataUrl }));
      }
    }
  }

  // 3. Set current layout in query data, based on what task we are on
  if (window.AltinnAppInstanceData?.layout && taskId && pageKey) {
    const currentLayoutSet = window.AltinnAppInstanceData?.layoutSets.sets.find((layoutSet) =>
      layoutSet.tasks?.includes(taskId),
    );
    if (currentLayoutSet) {
      queryClient.setQueryData(
        layoutsKeys.byLayoutSet({ layoutSetId: currentLayoutSet.id }),
        window.AltinnAppInstanceData?.layout,
      );
    }
  }

  return null;
}

export function createInstanceLoader(context: InstanceLoaderProps['context']) {
  return (args: LoaderFunctionArgs) => instanceLoader({ ...args, context });
}
