import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Branch } from 'app-shared/types/api/BranchTypes';

export const useBranchesQuery = (org: string, app: string): UseQueryResult<Array<Branch>> => {
  const { getBranches } = useServicesContext();
  return useQuery<Array<Branch>>({
    queryKey: [QueryKey.Branches, org, app],
    queryFn: () => getBranches(org, app),
  });
};
