import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AxiosError } from 'axios';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { isXsdFile } from 'app-shared/utils/filenameUtils';
import { removeStart } from 'app-shared/utils/stringUtils';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import type { ApiError } from 'app-shared/types/api/ApiError';

export const useSchemaQuery = (
  modelPath: string,
): UseQueryResult<JsonSchema | null, AxiosError<ApiError, any>> => {
  const { org, app } = useStudioUrlParams();
  const { getDatamodel, addXsdFromRepo } = useServicesContext();
  return useQuery<JsonSchema | null, AxiosError<ApiError, any>>({
    queryKey: [QueryKey.JsonSchema, org, app, modelPath],
    queryFn: async (): Promise<JsonSchema> =>
      isXsdFile(modelPath)
        ? addXsdFromRepo(org, app, removeStart(modelPath, '/'))
        : getDatamodel(org, app, modelPath),
  });
};
