import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Repository } from 'app-shared/types/Repository';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { AxiosError } from 'axios';

/**
 * Query function to get the metadata of a repo
 *
 * @param owner the owner of the repo
 * @param app the application
 *
 * @returns useQuery result with the Repository
 */
export const useRepoMetadataQuery = (
  owner: string,
  app: string,
): UseQueryResult<Repository, AxiosError> => {
  const { getRepoMetadata } = useServicesContext();
  return useQuery<Repository, AxiosError>({
    queryKey: [QueryKey.RepoMetaData, owner, app],
    queryFn: () => getRepoMetadata(owner, app),
  });
};
