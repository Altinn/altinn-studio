import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';
import type { AxiosError } from 'axios';

export const useDataModelsJsonQuery = (
  owner,
  app,
): UseQueryResult<DataModelMetadataJson[], AxiosError> => {
  const { getDataModelsJson } = useServicesContext();
  return useQuery<DataModelMetadataJson[], AxiosError>({
    queryKey: [QueryKey.DataModelsJson, owner, app],
    queryFn: () => getDataModelsJson(owner, app),
  });
};
