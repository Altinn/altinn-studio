import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { BranchStatus } from 'app-shared/types/BranchStatus';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useBranchStatusQuery = (
  owner: string,
  app: string,
  branch: string | undefined,
): UseQueryResult<BranchStatus> => {
  const { getBranchStatus } = useServicesContext();
  return useQuery<BranchStatus>({
    queryKey: [QueryKey.BranchStatus, owner, app, branch],
    queryFn: () => getBranchStatus(owner, app, branch),
    enabled: !!branch,
  });
};
