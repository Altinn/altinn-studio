import type { MutationMeta } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const useUploadDatamodelMutation = (meta?: MutationMeta) => {
  const { uploadDatamodel } = useServicesContext();
  const { org, app } = useStudioUrlParams();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: FormData) => uploadDatamodel(org, app, file),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.DatamodelsJson, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.DatamodelsXsd, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] }),
      ]);
    },
    meta,
  });
};
