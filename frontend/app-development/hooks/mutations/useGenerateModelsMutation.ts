import type { UseMutationResult, QueryMeta } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AxiosError } from 'axios';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ApiError } from 'app-shared/types/api/ApiError';

export const useGenerateModelsMutation = (
  modelPath: string,
  meta?: QueryMeta,
): UseMutationResult<void, AxiosError<ApiError>> => {
  const queryClient = useQueryClient();
  const { org, app } = useStudioEnvironmentParams();
  const { generateModels } = useServicesContext();
  return useMutation({
    mutationFn: (payload: JsonSchema) => generateModels(org, app, modelPath, payload),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.DatamodelsJson, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.DatamodelsXsd, org, app] }),
      ]),
    meta,
  });
};
