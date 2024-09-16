import type { QueryMeta } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useGenerateModelsMutation = (modelPath: string, meta?: QueryMeta) => {
  const queryClient = useQueryClient();
  const { org, app } = useStudioEnvironmentParams();
  const { generateModels } = useServicesContext();
  return useMutation({
    mutationFn: (payload: JsonSchema) => generateModels(org, app, modelPath, payload),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsJson, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsXsd, org, app] }),
      ]),
    meta,
  });
};
