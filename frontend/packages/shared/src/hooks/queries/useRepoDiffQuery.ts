import type { MutationMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AxiosError } from 'axios';
import type { RepoDiffResponse } from 'app-shared/types/api/RepoDiffResponse';

export const useRepoDiffQuery = (
  owner: string,
  app: string,
  meta?: MutationMeta,
): UseQueryResult<RepoDiffResponse, AxiosError> => {
  const { getRepoDiff } = useServicesContext();
  return useQuery<RepoDiffResponse, AxiosError>({
    queryKey: [QueryKey.RepoDiff, owner, app],
    queryFn: () => getRepoDiff(owner, app),
    staleTime: 0,
    meta: {
      hideDefaultError: true,
    },
  });
};
