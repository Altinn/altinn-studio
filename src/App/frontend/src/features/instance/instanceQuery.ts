import { queryOptions, skipToken } from '@tanstack/react-query';

import { fetchInstanceData } from 'src/http-client/queries';

type InstanceDataParams = {
  instanceOwnerPartyId: string | undefined;
  instanceGuid: string | undefined;
};

export function instanceDataQueryKey({ instanceOwnerPartyId, instanceGuid }: InstanceDataParams) {
  return ['instanceData', { instanceOwnerPartyId, instanceGuid }] as const;
}

export const instanceQueries = {
  all: () => ['instanceData'] as const,
  instanceData: ({ instanceOwnerPartyId, instanceGuid }: InstanceDataParams) =>
    queryOptions({
      queryKey: instanceDataQueryKey({ instanceOwnerPartyId, instanceGuid }),
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
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }),
};
