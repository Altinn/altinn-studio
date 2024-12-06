import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AxiosError } from 'axios';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ApiError } from 'app-shared/types/api/ApiError';

export const useSchemaQuery = (
  modelPath: string,
): UseQueryResult<JsonSchema | null, AxiosError<ApiError, any>> => {
  const { org, app } = useStudioEnvironmentParams();
  const { getDataModel } = useServicesContext();
  return useQuery<JsonSchema | null, AxiosError<ApiError, any>>({
    queryKey: [QueryKey.JsonSchema, org, app, modelPath],
    queryFn: async (): Promise<JsonSchema> => getDataModel(org, app, modelPath),
    structuralSharing: false,
  });
};
