import type { MutationMeta } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useUploadDataModelMutation = (modelPath?: string, meta?: MutationMeta) => {
  const { uploadDataModel } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  const queryClient = useQueryClient();

  const mutationFn = (file: File) => {
    const formData = createFormDataWithFile(file);
    return uploadDataModel(org, app, formData);
  };

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsJson, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsXsd, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadata, org, app] }),
        modelPath &&
          queryClient.invalidateQueries({ queryKey: [QueryKey.JsonSchema, org, app, modelPath] }),
      ]);
    },
    meta,
  });
};

const createFormDataWithFile = (file: File): FormData => {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
};
