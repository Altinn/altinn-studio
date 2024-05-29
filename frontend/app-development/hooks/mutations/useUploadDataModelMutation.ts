import type { MutationMeta } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const useUploadDataModelMutation = (meta?: MutationMeta) => {
  const { uploadDataModel } = useServicesContext();
  const { org, app } = useStudioUrlParams();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: FormData) => uploadDataModel(org, app, file),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsJson, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsXsd, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] }),
      ]);
    },
    meta,
  });
};
