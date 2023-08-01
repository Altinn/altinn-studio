import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { buildUiSchema } from '@altinn/schema-model';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useSelectedSchemaContext } from '@altinn/schema-editor/hooks/useSelectedSchemaContext';

export const useAddXsdFromRepoMutation = () => {
  const { org, app } = useParams<{ org: string; app: string }>();
  const { addXsdFromRepo } = useServicesContext();
  const { modelPath } = useSelectedSchemaContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => addXsdFromRepo(org, app, modelPath),
    onSuccess: async (schema: JsonSchema) => {
      queryClient.setQueryData([QueryKey.Datamodel, org, app, modelPath], buildUiSchema(schema));
      await queryClient.invalidateQueries([QueryKey.DatamodelsMetadata, org, app]);
    }
  });
}
