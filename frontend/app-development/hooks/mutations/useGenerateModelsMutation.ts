import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { JsonSchema } from 'app-shared/types/JsonSchema';

export const useGenerateModelsMutation = (modelPath: string): UseMutationResult<void, AxiosError> => {
  const queryClient = useQueryClient();
  const { org, app } = useParams<{ org: string; app: string }>();
  const { generateModels } = useServicesContext();
  return useMutation({
    mutationFn: (payload: JsonSchema) => generateModels(org, app, modelPath, payload),
    onSuccess: () => queryClient.invalidateQueries([QueryKey.DatamodelsMetadata, org, app]),
  });
}
