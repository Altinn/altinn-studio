import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  buildJsonSchema,
  buildUiSchema,
  hasEmptyCombination,
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
 * Returns the model as valid JSON Schema, leaving out the states that the editor allows while the
 * user is working but that the backend rejects - currently combinations without subschemas. The
 * model is returned unchanged when it is already valid.
 */
const toValidJsonSchema = (model: JsonSchema): JsonSchema => {
  // This runs on every autosave, and scanning the raw schema is much cheaper than converting it.
  if (!hasEmptyCombination(model)) return model;
  // Removal happens on nodes, which know about parents, references and required lists, so whatever
  // pointed at a removed combination is cleaned up too.
  const nodes = buildUiSchema(model);
  if (!nodes.some(isEmptyCombination)) return model;
  return buildJsonSchema(removeEmptyCombinations(nodes));
};
