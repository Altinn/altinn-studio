import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { CreateDatamodelPayload } from 'app-shared/types/api';
import { QueryKey } from 'app-shared/types/QueryKey';

export interface CreateDatamodelMutationArgs {
  name: string;
  relativePath: string;
}

export const useCreateDatamodelMutation = () => {
  const { createDatamodel } = useServicesContext();
  const { org, app } = useParams<{ org: string; app: string }>();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, relativePath }: CreateDatamodelMutationArgs) => {
      const payload: CreateDatamodelPayload = {
        modelName: name,
        relativeDirectory: relativePath,
      };
      const schema = await createDatamodel(org, app, payload);
      queryClient.setQueryData([QueryKey.JsonSchema, org, app, name], schema);
      await queryClient.invalidateQueries([QueryKey.DatamodelsMetadata, org, app]);
    },
  })
}
