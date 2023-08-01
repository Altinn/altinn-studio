import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { buildJsonSchema } from '@altinn/schema-model';
import { useParams } from 'react-router-dom';
import { useSelectedSchemaContext } from '@altinn/schema-editor/hooks/useSelectedSchemaContext';
import { AxiosError } from 'axios';

export const useGenerateModelsMutation = (): UseMutationResult<void, AxiosError> => {
  const queryClient = useQueryClient();
  const { org, app } = useParams<{ org: string; app: string }>();
  const { modelPath } = useSelectedSchemaContext();
  const { generateModels } = useServicesContext();
  return useMutation({
    mutationFn: (payload: UiSchemaNodes) => generateModels(org, app, modelPath, buildJsonSchema(payload)),
    onSuccess: () => queryClient.invalidateQueries([QueryKey.DatamodelsMetadata, org, app]),
  });
}
