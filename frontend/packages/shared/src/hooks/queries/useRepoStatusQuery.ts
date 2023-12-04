import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { RepoStatus } from 'app-shared/types/RepoStatus';
import { AxiosError } from 'axios';

export const useRepoStatusQuery = (
  owner: string,
  app: string,
): UseQueryResult<RepoStatus, AxiosError> => {
  const { getRepoStatus } = useServicesContext();
  return useQuery<RepoStatus, AxiosError>({
    queryKey: [QueryKey.RepoStatus, owner, app],
    queryFn: () => getRepoStatus(owner, app),
  });
};
