import { queryOptions, skipToken } from '@tanstack/react-query';

import { fetchInstanceData } from 'src/http-client/queries';

export const instanceQueries = {
  all: () => ['instanceData'] as const,
  instanceData: ({
    instanceOwnerPartyId,
    instanceGuid,
  }: {
    instanceOwnerPartyId: string | undefined;
    instanceGuid: string | undefined;
  }) =>
    queryOptions({
      queryKey: [...instanceQueries.all(), { instanceOwnerPartyId, instanceGuid }] as const,
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
