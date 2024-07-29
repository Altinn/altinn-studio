import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AxiosError } from 'axios';

export type RepoDiff = { [key: string]: string };

export const useRepoDiffQuery = (
  owner: string,
  app: string,
): UseQueryResult<RepoDiff, AxiosError> => {
  const { getRepoDiff } = useServicesContext();
  return useQuery<RepoDiff, AxiosError>({
    queryKey: [QueryKey.RepoDiff, owner, app],
    queryFn: () => getRepoDiff(owner, app),
    staleTime: 0,
  });
};
