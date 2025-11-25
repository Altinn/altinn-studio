import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { CurrentBranchInfo } from 'app-shared/types/api/BranchTypes';

export const useCurrentBranchQuery = (
  org: string,
  app: string,
): UseQueryResult<CurrentBranchInfo> => {
  const { getCurrentBranch } = useServicesContext();
  return useQuery<CurrentBranchInfo>({
    queryKey: [QueryKey.CurrentBranch, org, app],
    queryFn: () => getCurrentBranch(org, app),
  });
};
