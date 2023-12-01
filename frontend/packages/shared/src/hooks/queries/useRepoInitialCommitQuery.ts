import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Commit, CommitAuthor } from 'app-shared/types/Commit';
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
  app: string,
): UseQueryResult<Commit, AxiosError> => {
  const { getRepoInitialCommit } = useServicesContext();
  return useQuery<Commit, AxiosError>({
    queryKey: [QueryKey.RepoInitialCommit, owner, app],
    queryFn: () => getRepoInitialCommit(owner, app),
    select: (data: Commit) => {
      // Convert the 'when' property of the author and comitter to a Date
      const author: CommitAuthor = {
        ...data.author,
        when: new Date(data.author.when),
      };
      const comitter: CommitAuthor = {
        ...data.comitter,
        when: new Date(data.comitter.when),
      };

      return { ...data, author, comitter };
    },
  });
};
