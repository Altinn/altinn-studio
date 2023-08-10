import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { CreateDatamodelPayload } from 'app-shared/types/api';
import { QueryKey } from 'app-shared/types/QueryKey';
import { buildUiSchema } from '@altinn/schema-model';

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
      const uiSchema = buildUiSchema(schema);
      queryClient.setQueryData([QueryKey.Datamodel, org, app, name], uiSchema);
      await queryClient.invalidateQueries([QueryKey.DatamodelsMetadata, org, app]);
    },
  })
}
