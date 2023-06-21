import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { buildJsonSchema } from '@altinn/schema-model';

export const useDatamodelMutation = (org: string, app: string, modelPath: string) => {
  const queryClient = useQueryClient();
  const { saveDatamodel } = useServicesContext();
  return useMutation({
    mutationFn: (payload: UiSchemaNodes) =>
      saveDatamodel(org, app, modelPath, buildJsonSchema(payload)).then(() => payload),
    onSuccess: (payload: UiSchemaNodes) => {
      queryClient.setQueryData(
        [QueryKey.Datamodel, org, app, modelPath],
        () => payload
      );
    }
  });
}
