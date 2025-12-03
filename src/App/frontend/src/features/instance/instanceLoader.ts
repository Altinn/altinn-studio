import type { LoaderFunctionArgs } from 'react-router-dom';

import type { QueryClient } from '@tanstack/react-query';

import { instanceDataQueryKey } from 'src/domain/Instance/useInstanceQuery';
import { getLayoutQueryKey, processLayouts } from 'src/domain/Layout/layoutQuery';
import type { IInstance } from 'src/types/shared';

interface InstanceLoaderProps extends LoaderFunctionArgs {
  context: {
    queryClient: QueryClient;
    instance?: IInstance;
  };
}

export async function instanceLoader({ context, params }: InstanceLoaderProps): Promise<unknown> {
  const { queryClient, instance } = context;

  const { app, instanceGuid, instanceOwnerPartyId, org, pageKey, taskId } = params;
  console.log({ app, instanceGuid, instanceOwnerPartyId, org, pageKey, taskId });
  console.log('window.AltinnAppInstanceData', window.AltinnAppInstanceData);
  console.log('params', params);

  // set current layout in query data, based on what task we are on

  if (!instance) {
    throw new Error('instance is required');
  }
  queryClient.setQueryData(
    instanceDataQueryKey({
      instanceOwnerPartyId: instance.instanceOwner.partyId,
      instanceGuid: instance.id.split('/')[1],
    }),
    instance,
  );
  if (window.AltinnAppInstanceData?.layout && taskId && pageKey) {
    const currentLayoutSet = window.AltinnAppInstanceData?.layoutSets.sets.find((layoutSet) =>
      layoutSet.tasks?.includes(taskId),
    );
    if (currentLayoutSet) {
      const processedLayouts = processLayouts(window.AltinnAppInstanceData?.layout, pageKey, currentLayoutSet.dataType);
      queryClient.setQueryData(getLayoutQueryKey(currentLayoutSet.id), processedLayouts);
    }
  }

  return null;
}

export function createInstanceLoader(context: InstanceLoaderProps['context']) {
  return (args: LoaderFunctionArgs) => instanceLoader({ ...args, context });
}
