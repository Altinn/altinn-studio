import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataModelMetadataXsd } from 'app-shared/types/DataModelMetadata';
import type { AxiosError } from 'axios';

export const useDataModelsXsdQuery = (
  owner,
  app,
): UseQueryResult<DataModelMetadataXsd[], AxiosError> => {
  const { getDataModelsXsd } = useServicesContext();
  return useQuery<DataModelMetadataXsd[], AxiosError>({
    queryKey: [QueryKey.DataModelsXsd, owner, app],
    queryFn: () => getDataModelsXsd(owner, app),
  });
};
