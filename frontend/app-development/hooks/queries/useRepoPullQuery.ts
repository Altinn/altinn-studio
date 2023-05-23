import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { RepoStatus } from 'app-shared/types/RepoStatus';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useRepoPullQuery = (owner, app, disabled?): UseQueryResult<RepoStatus> => {
  const { getRepoPull } = useServicesContext();
  return useQuery<RepoStatus>(
    [QueryKey.RepoPullData, owner, app],
    () => getRepoPull(owner, app), { enabled: !disabled }
  );
};
