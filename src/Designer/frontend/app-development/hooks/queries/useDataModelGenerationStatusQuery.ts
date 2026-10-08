import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AxiosError } from 'axios';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ApiError } from 'app-shared/types/api/ApiError';

export const useDataModelGenerationStatusQuery = (
  modelPath: string,
): UseQueryResult<boolean, AxiosError<ApiError>> => {
  const { org, app } = useStudioEnvironmentParams();
  const { getDataModelGenerationStatus } = useServicesContext();
  return useQuery<boolean, AxiosError<ApiError>>({
    queryKey: [QueryKey.DataModelGenerationStatus, org, app, modelPath],
    queryFn: () => getDataModelGenerationStatus(org, app, modelPath),
    enabled: Boolean(modelPath),
  });
};
