import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Whether the C# model is older than the data model, so the fields added since do not exist when the
 * app runs. Same key as in the data model editor, so the two share the cache.
 */
export const useIsModelOutOfDateQuery = (
  org: string,
  app: string,
  modelPath: string | undefined,
): UseQueryResult<boolean> => {
  const { getDataModelGenerationStatus } = useServicesContext();
  return useQuery<boolean>({
    queryKey: [QueryKey.DataModelGenerationStatus, org, app, modelPath],
    queryFn: () => getDataModelGenerationStatus(org, app, modelPath),
    enabled: Boolean(modelPath),
  });
};
