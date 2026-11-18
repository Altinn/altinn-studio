import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataModel } from './useDataModelQuery';

/**
 * Generates the C# model from the data model, which compiles the app's code and takes a few seconds.
 * The builder saves only the data model as the user works, so this runs when the app is to be tested
 * or the user asks for it.
 */
export const useGenerateModelMutation = (org: string, app: string) => {
  const { generateModels } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelPath, schema }: DataModel) => generateModels(org, app, modelPath, schema),
    onSuccess: (_data, { modelPath }) =>
      Promise.all(
        [
          [QueryKey.DataModelsJson, org, app],
          [QueryKey.DataModelsXsd, org, app],
          [QueryKey.AppMetadata, org, app],
          [QueryKey.AppMetadataModelIds, org, app],
          [QueryKey.DataModelGenerationStatus, org, app, modelPath],
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
};
