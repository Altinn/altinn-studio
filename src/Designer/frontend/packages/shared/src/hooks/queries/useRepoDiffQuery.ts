import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { HttpError } from 'app-shared/utils/networking';
import type { RepoDiffResponse } from 'app-shared/types/api/RepoDiffResponse';

export const useRepoDiffQuery = (
  owner: string,
  app: string,
): UseQueryResult<RepoDiffResponse, HttpError> => {
  const { getRepoDiff } = useServicesContext();
  return useQuery<RepoDiffResponse, HttpError>({
    queryKey: [QueryKey.RepoDiff, owner, app],
    queryFn: () => getRepoDiff(owner, app),
    staleTime: 0,
    meta: {
      hideDefaultError: true,
    },
  });
};
