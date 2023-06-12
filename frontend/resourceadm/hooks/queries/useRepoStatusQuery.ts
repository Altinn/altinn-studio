import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { RepoStatus } from 'app-shared/types/RepoStatus';

export const useRepoStatusQuery = (owner, app): UseQueryResult<RepoStatus> => {
  const { getRepoStatus } = useServicesContext();
  return useQuery<RepoStatus>([QueryKey.RepoStatus, owner, app], () => getRepoStatus(owner, app));
};
