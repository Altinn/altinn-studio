import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { IRepository } from '../../types/global';
import { useServicesContext } from '../../common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';

export const useRepoMetadataQuery = (owner, app): UseQueryResult<IRepository> => {
  const { getRepoMetadata } = useServicesContext();
  return useQuery<IRepository>([QueryKey.RepoMetaData, owner, app], () =>
    getRepoMetadata(owner, app)
  );
};
