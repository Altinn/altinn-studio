import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  buildJsonSchema,
  buildUiSchema,
  isEmptyCombination,
  removeEmptyCombinations,
} from '@altinn/schema-model';

export const useSchemaMutation = () => {
  const queryClient = useQueryClient();
  const { org, app } = useStudioEnvironmentParams();
  const { saveDataModel } = useServicesContext();
  return useMutation({
    mutationFn: async (args: { modelPath: string; model: JsonSchema }) => {
      const { modelPath, model } = args;
      queryClient.setQueryData([QueryKey.JsonSchema, org, app, modelPath], () => model);
      await saveDataModel(org, app, modelPath, toValidJsonSchema(model));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsMetadata, org, app] });
    },
  });
};

/**
 * The editor keeps combinations without subschemas while the user works on them, but the backend
 * rejects them.
 */
const toValidJsonSchema = (model: JsonSchema): JsonSchema => {
  const nodes = buildUiSchema(model);
  if (!nodes.some(isEmptyCombination)) return model;
  return buildJsonSchema(removeEmptyCombinations(nodes));
};
