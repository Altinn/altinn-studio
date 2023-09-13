import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const useSchemaMutation = () => {
  const queryClient = useQueryClient();
  const { org, app } = useStudioUrlParams();
  const { saveDatamodel } = useServicesContext();
  return useMutation({
    mutationFn: async (args: { modelPath: string; schema: JsonSchema }) => {
      const { modelPath, schema } = args;
      await saveDatamodel(org, app, modelPath, schema);
      queryClient.setQueryData([QueryKey.JsonSchema, org, app, modelPath], () => schema);
    },
  });
};
