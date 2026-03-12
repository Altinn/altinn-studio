import { queryOptions, skipToken } from '@tanstack/react-query';

import { fetchInstanceData } from 'src/queries/queries';

export interface InstanceQueryParams {
  instanceOwnerPartyId: string | undefined;
  instanceGuid: string | undefined;
}

export const instanceQueryKeys = {
  all: () => ['instanceData'] as const,
  instance: ({ instanceOwnerPartyId, instanceGuid }: InstanceQueryParams) =>
    [...instanceQueryKeys.all(), { instanceOwnerPartyId, instanceGuid }] as const,
};

export function instanceDataQueryOptions({ instanceOwnerPartyId, instanceGuid }: InstanceQueryParams) {
  return queryOptions({
    queryKey: instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid }),
    queryFn:
      !instanceOwnerPartyId || !instanceGuid
        ? skipToken
        : async () => {
            try {
              return await fetchInstanceData(instanceOwnerPartyId, instanceGuid);
            } catch (error) {
              window.logError('Fetching instance data failed:\n', error);
              throw error;
            }
          },
    refetchIntervalInBackground: false,
  });
}
