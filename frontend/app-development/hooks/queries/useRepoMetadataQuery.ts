import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Repository } from 'app-shared/types/Repository';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useRepoMetadataQuery = (owner, app): UseQueryResult<Repository> => {
  const { getRepoMetadata } = useServicesContext();
  return useQuery<Repository>(
    [QueryKey.RepoMetaData, owner, app],
    () => getRepoMetadata(owner, app),
  );
};
