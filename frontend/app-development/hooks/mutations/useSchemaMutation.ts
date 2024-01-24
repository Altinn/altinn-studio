import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const useSchemaMutation = () => {
  const queryClient = useQueryClient();
  const { org, app } = useStudioUrlParams();
  const { saveDatamodel } = useServicesContext();
  return useMutation({
    mutationFn: async (args: { modelPath: string; model: JsonSchema }) => {
      const { modelPath, model } = args;
      queryClient.setQueryData([QueryKey.JsonSchema, org, app, modelPath], () => model);
      await saveDatamodel(org, app, modelPath, model);
    },
  });
};
