import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import { getRepositoryType } from 'app-shared/utils/repository';
import { RepositoryType } from 'app-shared/types/global';

export const useDataModelsJsonQuery = (
  owner: string,
  app: string,
): UseQueryResult<DataModelMetadataJson[], Error> => {
  const { getOrgDataModelsJson, getAppDataModelsJson } = useServicesContext();
  const repositoryType = getRepositoryType(owner, app);

  return useQuery<DataModelMetadataJson[], Error>({
    queryKey: [QueryKey.DataModelsJson, owner, app],
    queryFn: () =>
      repositoryType === RepositoryType.DataModels
        ? getOrgDataModelsJson(owner, app)
        : getAppDataModelsJson(owner, app),
  });
};
