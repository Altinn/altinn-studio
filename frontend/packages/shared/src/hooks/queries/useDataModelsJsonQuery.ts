import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';

export const useDataModelsJsonQuery = (
  owner: string,
  app: string,
): UseQueryResult<DataModelMetadataJson[], Error> => {
  const { getAppDataModelsJson } = useServicesContext();
  return useQuery<DataModelMetadataJson[], Error>({
    queryKey: [QueryKey.DataModelsJson, owner, app],
    queryFn: () => getAppDataModelsJson(owner, app),
  });
};
