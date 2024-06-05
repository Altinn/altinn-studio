import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { CreateDataModelPayload } from 'app-shared/types/api';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export interface CreateDataModelMutationArgs {
  name: string;
  relativePath: string;
}

export const useCreateDataModelMutation = () => {
  const { createDataModel } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, relativePath }: CreateDataModelMutationArgs) => {
      const payload: CreateDataModelPayload = {
        modelName: name,
        relativeDirectory: relativePath,
      };
      const schema = await createDataModel(org, app, payload);
      queryClient.setQueryData([QueryKey.JsonSchema, org, app, name], schema);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsJson, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsXsd, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] }),
      ]);
    },
  });
};
