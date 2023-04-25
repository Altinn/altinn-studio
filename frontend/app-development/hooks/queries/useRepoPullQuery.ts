import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { RepoStatus } from '../../features/appPublish/hooks/query-hooks';
import { useServicesContext } from '../../common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';

export const useRepoPullQuery = (owner, app, disabled?): UseQueryResult<RepoStatus> => {
  const { getRepoPull } = useServicesContext();
  return useQuery<RepoStatus>([QueryKey.RepoPullData, owner, app], () => getRepoPull(owner, app), {
    enabled: !disabled,
  });
};
