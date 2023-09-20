import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Repository } from 'app-shared/types/Repository';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Query function to get the data of the intial commit of a repo
 *
 * @param owner the owner of the repo
 * @param app the application
 *
 * @returns useQuery result with the Repository
 */
export const useRepoInitialCommitQuery = (owner: string, app: string): UseQueryResult<any> => {
  const { getRepoMetadata } = useServicesContext();
  return useQuery<any>([QueryKey.RepoInitialCommit, owner, app], () => getRepoMetadata(owner, app));
};
