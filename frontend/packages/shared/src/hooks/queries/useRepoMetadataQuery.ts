import type { QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { Repository } from 'app-shared/types/Repository';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Query function to get the metadata of a repo
 *
 * @param owner the owner of the repo
 * @param app the application
 *
 * @returns useQuery result with the Repository
 */
export const useRepoMetadataQuery = (owner: string, app: string, meta?: QueryMeta) => {
  const { getRepoMetadata } = useServicesContext();
  return useQuery<Repository>({
    queryKey: [QueryKey.RepoMetadata, owner, app],
    queryFn: () => getRepoMetadata(owner, app),
    meta,
  });
};
