import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataModelMetadataJson } from 'app-shared/types/DataModelMetadata';

export const useOrgDataModelsJsonQuery = (
  owner: string,
  app: string,
): UseQueryResult<DataModelMetadataJson[], Error> => {
  const { getOrgDataModelsJson } = useServicesContext();

  return useQuery<DataModelMetadataJson[], Error>({
    queryKey: [QueryKey.DataModelsJson, owner, app],
    queryFn: () => getOrgDataModelsJson(owner, app),
  });
};
