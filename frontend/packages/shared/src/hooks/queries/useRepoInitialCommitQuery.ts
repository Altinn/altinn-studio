import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Commit } from 'app-shared/types/Commit';
import { AxiosError } from 'axios';

/**
 * Query function to get the data of the intial commit of a repo
 *
 * @param owner the owner of the repo
 * @param app the application
 *
 * @returns useQuery result with the Repository
 */
export const useRepoInitialCommitQuery = (
  owner: string,
  app: string
): UseQueryResult<Commit, AxiosError> => {
  const { getRepoInitialCommit } = useServicesContext();
  return useQuery<Commit, AxiosError>([QueryKey.RepoInitialCommit, owner, app], () =>
    getRepoInitialCommit(owner, app)
  );
};
