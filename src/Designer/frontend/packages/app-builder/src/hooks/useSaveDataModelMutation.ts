import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { JsonSchema } from 'app-shared/types/JsonSchema';

export type SaveDataModelArgs = {
  modelPath: string;
  schema: JsonSchema;
};

/**
 * Saves the JSON schema only. Generating the C# model compiles it on the server, so it is generated
 * when the user shares the changes, not on every change. The preview does not need it.
 */
export const useSaveDataModelMutation = (org: string, app: string) => {
  const { saveDataModel } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ modelPath, schema }: SaveDataModelArgs) =>
      saveDataModel(org, app, modelPath, schema),
    onMutate: ({ modelPath, schema }: SaveDataModelArgs): void => {
      queryClient.setQueryData([QueryKey.JsonSchema, org, app, modelPath], schema);
    },
    onError: (_error, { modelPath }) =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.JsonSchema, org, app, modelPath] }),
    onSuccess: (_data, { modelPath }) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelMetadata, org, app] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsMetadata, org, app] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.DataModelGenerationStatus, org, app, modelPath],
      });
    },
  });
};
