import type { QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { RepoStatus } from 'app-shared/types/RepoStatus';

export const useRepoStatusQuery = (owner: string, app: string, meta?: QueryMeta) => {
  const { getRepoStatus } = useServicesContext();
  return useQuery<RepoStatus>({
    queryKey: [QueryKey.RepoStatus, owner, app],
    queryFn: () => getRepoStatus(owner, app),
    meta,
  });
};
