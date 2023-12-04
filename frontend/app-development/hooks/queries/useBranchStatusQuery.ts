import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { BranchStatus } from 'app-shared/types/BranchStatus';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useBranchStatusQuery = (owner, app, branch): UseQueryResult<BranchStatus> => {
  const { getBranchStatus } = useServicesContext();
  return useQuery<BranchStatus>({
    queryKey: [QueryKey.BranchStatus, owner, app, branch],
    queryFn: () => getBranchStatus(owner, app, branch),
  });
};
