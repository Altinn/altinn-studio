import { useQuery, UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Hook to get the current branch of a repository
 * @param owner - The repository owner
 * @param app - The repository name
 * @returns useQuery result with the current branch name
 */
export const useRepoCurrentBranchQuery = (
  owner: string,
  app: string,
): UseQueryResult<string, AxiosError> => {
  const { getRepoCurrentBranch } = useServicesContext();
  return useQuery<string, AxiosError>({
    queryKey: [QueryKey.RepoCurrentBranch, owner, app],
    queryFn: () => getRepoCurrentBranch(owner, app),
  });
};
