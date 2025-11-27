import type { LoaderFunctionArgs } from 'react-router-dom';

import type { QueryClient } from '@tanstack/react-query';

import { instanceDataQueryKey } from 'src/features/instance/instanceQuery';
import type { IInstance } from 'src/types/shared';

interface InstanceLoaderProps extends LoaderFunctionArgs {
  context: {
    queryClient: QueryClient;
    instance: IInstance;
  };
}

export async function instanceLoader(params: InstanceLoaderProps): Promise<unknown> {
  const { queryClient, instance } = params.context;
  // const queryKey = instanceQueries.instanceData({
  //   instanceOwnerPartyId: instance.instanceOwner.partyId,
  //   instanceGuid: instance.id,
  // }).queryKey;

  const queryKey = instanceDataQueryKey({
    instanceOwnerPartyId: instance.instanceOwner.partyId,
    instanceGuid: instance.id.split('/')[1],
  });

  queryClient.setQueryData(
    instanceDataQueryKey({
      instanceOwnerPartyId: instance.instanceOwner.partyId,
      instanceGuid: instance.id.split('/')[1],
    }),
    instance,
  );

  // debugger;

  return null;
}

export function createInstanceLoader(context: InstanceLoaderProps['context']) {
  return (args: LoaderFunctionArgs) => instanceLoader({ ...args, context });
}
