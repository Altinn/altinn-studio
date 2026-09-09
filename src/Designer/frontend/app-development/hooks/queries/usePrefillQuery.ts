import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AxiosError } from 'axios';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ApiError } from 'app-shared/types/api/ApiError';

export const usePrefillQuery = (
  modelPath: string,
): UseQueryResult<PrefillConfig | null, AxiosError<ApiError, any>> => {
  const { org, app } = useStudioEnvironmentParams();
  const { getDataModelPrefill } = useServicesContext();
  return useQuery<PrefillConfig | null, AxiosError<ApiError, any>>({
    queryKey: [QueryKey.Prefill, org, app, modelPath],
    queryFn: async (): Promise<PrefillConfig | null> => getDataModelPrefill(org, app, modelPath),
  });
};
