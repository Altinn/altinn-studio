import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { RepoStatus } from 'app-shared/types/RepoStatus';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useRepoPullQuery = (
  owner: string,
  app: string,
  disabled?: boolean, // set to true if you want the browser to NOT perform the API call on refresh
): UseQueryResult<RepoStatus> => {
  const { getRepoPull } = useServicesContext();
  return useQuery<RepoStatus>({
    queryKey: [QueryKey.RepoPullData, owner, app],
    queryFn: () => getRepoPull(owner, app),
    enabled: !disabled,
  });
};
