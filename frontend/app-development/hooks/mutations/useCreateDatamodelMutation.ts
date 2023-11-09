import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { CreateDatamodelPayload } from 'app-shared/types/api';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export interface CreateDatamodelMutationArgs {
  name: string;
  relativePath: string;
}

export const useCreateDatamodelMutation = () => {
  const { createDatamodel } = useServicesContext();
  const { org, app } = useStudioUrlParams();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, relativePath }: CreateDatamodelMutationArgs) => {
      const payload: CreateDatamodelPayload = {
        modelName: name,
        relativeDirectory: relativePath,
      };
      const schema = await createDatamodel(org, app, payload);
      queryClient.setQueryData([QueryKey.JsonSchema, org, app, name], schema);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.DatamodelsJson, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.DatamodelsXsd, org, app] }),
      ]);
    },
  });
};
