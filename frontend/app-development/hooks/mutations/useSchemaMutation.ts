import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { JsonSchema } from 'app-shared/types/JsonSchema';

export const useSchemaMutation = (modelPath: string) => {
  const queryClient = useQueryClient();
  const { org, app } = useParams<{ org: string; app: string }>();
  const { saveDatamodel } = useServicesContext();
  return useMutation({
    mutationFn: (payload: JsonSchema) => saveDatamodel(org, app, modelPath, payload).then(() => payload),
    onSuccess: async (payload: JsonSchema) => {
      await queryClient.invalidateQueries([QueryKey.DatamodelsMetadata, org, app]);
      queryClient.setQueryData(
        [QueryKey.JsonSchema, org, app, modelPath],
        () => payload
      );
    }
  });
}
