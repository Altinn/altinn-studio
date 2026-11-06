import { useCallback } from 'react';

import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { NotificationStatus } from 'src/core/api-client/signing.api';
import { useAppQueries } from 'src/core/queries/AppQueriesProvider';
import { signingQueryKeys } from 'src/core/queries/signeeList/signing.queries';
import type { SigneeState } from 'src/core/api-client/signing.api';
import type { AppQueries } from 'src/core/queries/types';
export { NotificationStatus };
export type { SigneeState };

const signingQueries = {
  all: signingQueryKeys.all,
  signeeList: (
    partyId: string | undefined,
    instanceGuid: string | undefined,
    taskId: string | undefined,
    api: Pick<AppQueries, 'fetchSigneeList'>,
  ) =>
    queryOptions({
      queryKey: [...signingQueries.all, 'signeeList', partyId, instanceGuid, taskId],
      queryFn: partyId && instanceGuid ? () => api.fetchSigneeList(partyId, instanceGuid, taskId) : skipToken,
      refetchInterval: 1000 * 60,
      refetchOnMount: 'always',
    }),
};

export function useSigneeList(
  partyId: string | undefined,
  instanceGuid: string | undefined,
  taskId: string | undefined,
) {
  const api = useAppQueries();
  const { data, error, isLoading, isFetching } = useQuery(
    signingQueries.signeeList(partyId, instanceGuid, taskId, api),
  );
  return { data, error, isLoading, isFetching };
}

export function useInvalidateSigningQueries() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: signingQueries.all });
  }, [queryClient]);
}
