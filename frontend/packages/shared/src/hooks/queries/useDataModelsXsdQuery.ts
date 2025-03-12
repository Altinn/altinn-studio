import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataModelMetadataXsd } from 'app-shared/types/DataModelMetadata';
import { isDataModelRepo } from 'app-shared/utils/repository';

export const useDataModelsXsdQuery = (
  owner: string,
  app: string,
): UseQueryResult<DataModelMetadataXsd[], Error> => {
  const { getOrgDataModelsXsd, getAppDataModelsXsd } = useServicesContext();

  return useQuery<DataModelMetadataXsd[], Error>({
    queryKey: [QueryKey.DataModelsXsd, owner, app],
    queryFn: () =>
      isDataModelRepo(app) ? getOrgDataModelsXsd(owner, app) : getAppDataModelsXsd(owner, app),
  });
};
