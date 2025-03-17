import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataModelMetadataXsd } from 'app-shared/types/DataModelMetadata';
import { getRepositoryType } from 'app-shared/utils/repository';
import { RepositoryType } from 'app-shared/types/global';

export const useDataModelsXsdQuery = (
  owner: string,
  app: string,
): UseQueryResult<DataModelMetadataXsd[], Error> => {
  const { getOrgDataModelsXsd, getAppDataModelsXsd } = useServicesContext();
  const repositoryType = getRepositoryType(owner, app);

  return useQuery<DataModelMetadataXsd[], Error>({
    queryKey: [QueryKey.DataModelsXsd, owner, app],
    queryFn: () =>
      repositoryType === RepositoryType.DataModels
        ? getOrgDataModelsXsd(owner, app)
        : getAppDataModelsXsd(owner, app),
  });
};
