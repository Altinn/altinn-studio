import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { Branch } from 'app-shared/types/BranchStatus';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AxiosError } from 'axios';

/**
 * Query function to get the branches of a repo
 *
 * @param owner the owner of the repo
 * @param app the application
 *
 * @returns useQuery result with the branches
 */
export const useRepoBranchesQuery = (
  owner: string,
  app: string,
  meta?: QueryMeta,
): UseQueryResult<Branch[], AxiosError> => {
  const { getRepoBranches } = useServicesContext();
  return useQuery<Branch[], AxiosError>({
    queryKey: [QueryKey.RepoBranches, owner, app],
    queryFn: () => getRepoBranches(owner, app),
    meta,
  });
};
