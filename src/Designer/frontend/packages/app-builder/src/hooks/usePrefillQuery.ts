import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';

// Same key as the prefill editor in the data model editor, so the two share the cache.
export const usePrefillQuery = (
  org: string,
  app: string,
  modelPath: string | undefined,
): UseQueryResult<PrefillConfig | null> => {
  const { getDataModelPrefill } = useServicesContext();
  return useQuery<PrefillConfig | null>({
    queryKey: [QueryKey.Prefill, org, app, modelPath],
    queryFn: () => getDataModelPrefill(org, app, modelPath),
    enabled: Boolean(modelPath),
  });
};
